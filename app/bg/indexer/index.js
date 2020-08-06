/**
 * The indexer creates the following datasets:
 * 
 *  - List of sites that have been indexed
 *  - List of resources that have been indexed
 *  - Metadata & file content for all indexed resources (including FTS index)
 *  - Notifications for resources which are relevant to the user
 * 
 * The indexer works by periodically listing all sites that we're interested in and
 * fetching a list of file updates since the last time the site was indexed. Those
 * updates are then passed into a set of "index definitions" which pick which updates
 * to index based on their metadata.
 * 
 * Sites which the user has "lost interest in" (ie unsubscribed from) will be deleted
 * from the index.
 * 
 * Current limitations:
 * 
 *  - Unable to index http/s sites
 *  - If any updates to a hyper site failes to index, the site will stop being indexed
 *  - Only subscribed and owned sites are indexed
 */

import { app } from 'electron'
import knex from 'knex'
import { attachOnConflictDoNothing } from 'knex-on-conflict-do-nothing'
import { attachOnConflictDoUpdate } from '../lib/db'
import * as path from 'path'
import mkdirp from 'mkdirp'
import * as filesystem from '../filesystem/index'
import * as drives from '../hyper/drives'
import * as logLib from '../logger'
const logger = logLib.get().child({category: 'indexer'})
import { TICK_INTERVAL, READ_TIMEOUT, METADATA_KEYS, parseUrl } from './const'
import { INDEXES } from './index-defs'
import lock from '../../lib/lock'
import { timer } from '../../lib/time'

/**
 * @typedef {import('./const').SubscribedSite} SubscribedSite
 * @typedef {import('./const').ResourceUpdate} ResourceUpdate
 * @typedef {import('./const').ParsedUrl} ParsedUrl
 * @typedef {import('./const').ResourceDescription} ResourceDescription
 */

// globals
// =

var db

// exported api
// =

/**
 * @param {Object} opts
 * @param {string} opts.userDataPath
 */
export async function setup (opts) {
  mkdirp.sync(path.join(opts.userDataPath, 'Indexes'))
  attachOnConflictDoNothing(knex)
  attachOnConflictDoUpdate(knex)
  db = knex({
    client: 'sqlite3',
    connection: {
      filename: path.join(opts.userDataPath, 'Indexes', 'beaker.db')
    },
    useNullAsDefault: true
  })
  await db.migrate.latest({directory: path.join(app.getAppPath(), 'bg', 'indexer', 'migrations')})
  tick()
}

export async function clearAllData () {
  try {
    var release = await lock('beaker-indexer')
    await db('sites').del()
  } finally {
    release()
  }
}

/**
 * @param {String} url 
 * @returns {Promise<ResourceDescription>}
 */
export async function get (url) {
  let urlp = parseUrl(url)
  var rows = await db('sites')
    .leftJoin('resources', 'sites.rowid', 'resources.site_rowid')
    .select('*', 'resources.rowid as resource_rowid')
    .where({
      'origin': urlp.origin,
      'path': urlp.path
    })
    .limit(1)
  if (!rows[0]) return undefined

  var resource_rowid = rows[0].resource_rowid
  var result = {
    url,
    index: rows[0].index,
    ctime: rows[0].ctime,
    mtime: rows[0].mtime,
    site: {
      url: urlp.origin,
      title: rows[0].title
    },
    metadata: {},
    links: [],
    content: undefined
  }

  rows = await db('resources_data').select('*').where({resource_rowid})
  for (let row of rows) {
    if (row.key === METADATA_KEYS.content) {
      result.content = row.value
    } else if (row.key === METADATA_KEYS.link) {
      result.links.push(row.value)
    } else {
      result.metadata[row.key] = row.value
    }
  }

  return result
}

export async function list (opts) {
  var sep = `[>${Math.random()}<]`
  var query = db('sites')
    .leftJoin('resources', 'sites.rowid', 'resources.site_rowid')
    .leftJoin('resources_data', 'resources.rowid', 'resources_data.resource_rowid')
    .select(
      'origin',
      'path',
      'index',
      'ctime',
      'mtime',
      'title as siteTitle',
      db.raw(`group_concat(resources_data.key, '${sep}') as data_keys`),
      db.raw(`group_concat(resources_data.value, '${sep}') as data_values`),
    )
    .groupBy('resource_rowid')
    .offset(opts?.offset || 0)
    .limit(opts?.limit || 25)

  if (opts?.filter?.site) {
    if (Array.isArray(opts.filter.site)) {
      query = query.whereIn('origin', opts.filter.site.map(site => parseUrl(site).origin))
    } else {
      query = query.where({origin: parseUrl(opts.filter.site).origin})
    }
  }
  if (opts?.filter?.index) {
    if (Array.isArray(opts.filter.index)) {
      query = query.whereIn('index', opts.filter.index)
    } else {
      query = query.where({index: opts.filter.index})
    }
  }
  if (opts?.filter?.ctime?.before) {
    query = query.whereRaw(`ctime < ?`, [opts.filter.ctime.before])
  }
  if (opts?.filter?.ctime?.after) {
    query = query.whereRaw(`ctime > ?`, [opts.filter.ctime.after])
  }

  if (opts?.sort && ['ctime', 'mtime', 'site'].includes(opts.sort)) {
    query = query.orderBy(opts.sort, opts?.reverse ? 'desc' : 'asc')
  } else {
    query = query.orderBy('ctime', 'desc')
  }

  var rows = await query
  return rows.map(row => {
    var record = {
      url: row.origin + row.path,
      index: row.index,
      ctime: row.ctime,
      mtime: row.mtime,
      site: {
        url: row.origin,
        title: row.siteTitle
      },
      metadata: {},
      links: [],
      content: undefined
    }
    var dataKeys = (row.data_keys || '').split(sep)
    var dataValues = (row.data_values || '').split(sep)
    for (let i = 0; i < dataKeys.length; i++) {
      let key = dataKeys[i]
      if (key === METADATA_KEYS.content) {
        record.content = dataValues[i]
      } else if (key === METADATA_KEYS.link) {
        record.links.push(dataValues[i])
      } else {
        record.metadata[key] = dataValues[i]
      }
    }
    return record
  })
}

export async function search (q = '', opts) {
  // prep search terms
  q = q
    .toLowerCase()
    .replace(/[:^*]/g, '') // strip symbols that sqlite interprets
    .replace(/[-]/g, ' ') // strip symbols that sqlite interprets
    + '*' // allow partial matches

  var query = db('resources_data_fts')
    .select(
      'origin',
      'path',
      'index',
      'ctime',
      'mtime',
      'title as siteTitle',
      'resource_rowid',
      'key',
      'rank',
      db.raw(`snippet(resources_data_fts, 0, '<b>', '</b>', '...', 30) as matchingText`)
    )
    .innerJoin('resources_data', 'resources_data.rowid', 'resources_data_fts.rowid')
    .innerJoin('resources', 'resources.rowid', 'resources_data.resource_rowid')
    .innerJoin('sites', 'sites.rowid', 'resources.site_rowid')
    .whereIn('resources_data.key', ['content', 'beaker/title'])
    .whereRaw(`resources_data_fts.value MATCH ?`, [q])
    .offset(opts?.offset || 0)
    .limit(opts?.limit || 25)

  if (opts?.filter?.site) {
    if (Array.isArray(opts.filter.site)) {
      query = query.whereIn('origin', opts.filter.site.map(site => parseUrl(site).origin))
    } else {
      query = query.where({origin: parseUrl(opts.filter.site).origin})
    }
  }
  if (opts?.filter?.index) {
    if (Array.isArray(opts.filter.index)) {
      query = query.whereIn('index', opts.filter.index)
    } else {
      query = query.where({index: opts.filter.index})
    }
  }
  if (opts?.filter?.ctime?.before) {
    query = query.whereRaw(`ctime < ?`, [opts.filter.ctime.before])
  }
  if (opts?.filter?.ctime?.after) {
    query = query.whereRaw(`ctime > ?`, [opts.filter.ctime.after])
  }

  if (opts?.sort && ['ctime', 'mtime'].includes(opts.sort)) {
    query = query.orderBy(opts.sort, opts.reverse ? 'desc' : 'asc')
  } else {
    query = query.orderBy('rank', 'desc')
  }

  var hits = await query

  // merge hits on the same record
  var mergedHits = {}
  for (let hit of hits) {
    mergedHits[hit.resource_rowid] = mergedHits[hit.resource_rowid] || []
    mergedHits[hit.resource_rowid].push(hit)
  }

  var results = await Promise.all(Object.values(mergedHits).map(async mergedHits => {
    var record = {
      url: mergedHits[0].origin + mergedHits[0].path,
      index: mergedHits[0].index,
      ctime: mergedHits[0].ctime,
      mtime: mergedHits[0].mtime,
      site: {
        url: mergedHits[0].origin,
        title: mergedHits[0].siteTitle
      },
      metadata: {},
      links: [],
      content: undefined,
      matches: mergedHits.map(hit => ({key: hit.key, value: hit.matchingText})),
      // with multiple hits, we just take the best bm25() rank
      // this basically ignores multiple matching attrs as a signal
      // which is fine for now -prf
      rank: Math.max(...mergedHits.map(h => h.rank))
    }

    var rows = await db('resources_data').select('*').where({resource_rowid: mergedHits[0].resource_rowid})
    for (let row of rows) {
      if (row.key === METADATA_KEYS.content) {
        record.content = row.value
      } else if (row.key === METADATA_KEYS.link) {
        record.links.push(row.value)
      } else {
        record.metadata[row.key] = row.value
      }
    }

    return record
  }))

  // gotta resort due to our merge
  if (opts?.sort === 'ctime') {
    results.sort((a, b) => a.ctime - b.ctime)
  } else if (opts?.sort === 'mtime') {
    results.sort((a, b) => a.mtime - b.mtime)
  } else {
    results.sort((a, b) => a.rank > b.rank ? -1 : 1)
  }
  if (opts?.reverse) {
    results.reverse()
  }

  return results
}

export async function listNotifications (opts) {
  var sep = `[>${Math.random()}<]`
  var query = db('notifications')
    .leftJoin('sites', 'sites.rowid', 'notifications.site_rowid')
    .leftJoin('resources', 'resources.rowid', 'notifications.resource_rowid')
    .leftJoin('resources_data', 'resources.rowid', 'resources_data.resource_rowid')
    .select(
      'notifications.rowid as rowid',
      'origin',
      'path',
      'index',
      'notifications.ctime as ctime',
      'mtime',
      'title as siteTitle',
      'type',
      'subject_origin',
      'subject_path',
      'is_read',
      db.raw(`group_concat(resources_data.key, '${sep}') as data_keys`),
      db.raw(`group_concat(resources_data.value, '${sep}') as data_values`),
    )
    .groupBy('notifications.resource_rowid')
    .offset(opts?.offset || 0)
    .limit(opts?.limit || 25)

  if (opts?.filter?.site) {
    if (Array.isArray(opts.filter.site)) {
      query = query.whereIn('origin', opts.filter.site.map(site => parseUrl(site).origin))
    } else {
      query = query.where({origin: parseUrl(opts.filter.site).origin})
    }
  }
  if (opts?.filter?.subject) {
    if (Array.isArray(opts.filter.subject)) {
      query = query.whereIn('subject_origin', opts.filter.subject.map(subject => parseUrl(subject).origin))
    } else {
      query = query.where({subject_origin: parseUrl(opts.filter.subject).origin})
    }
  }
  if (opts?.filter?.index) {
    if (Array.isArray(opts.filter.index)) {
      query = query.whereIn('index', opts.filter.index)
    } else {
      query = query.where({index: opts.filter.index})
    }
  }
  if (opts?.filter?.type) {
    if (Array.isArray(opts.filter.type)) {
      query = query.whereIn('type', opts.filter.type)
    } else {
      query = query.where({type: opts.filter.type})
    }
  }
  if (opts?.filter?.is_read) {
    query = query.where({is_read: opts.filter.is_read})
  }
  if (opts?.filter?.ctime?.before) {
    query = query.whereRaw(`ctime < ?`, [opts.filter.ctime.before])
  }
  if (opts?.filter?.ctime?.after) {
    query = query.whereRaw(`ctime > ?`, [opts.filter.ctime.after])
  }

  if (opts?.sort && ['ctime', 'mtime'].includes(opts.sort)) {
    query = query.orderBy(opts.sort, opts?.reverse ? 'desc' : 'asc')
  } else {
    query = query.orderBy('ctime', 'desc')
  }

  var rows = await query
  return rows.map(row => {
    var record = {
      url: row.origin + row.path,
      index: row.index,
      ctime: row.ctime,
      mtime: row.mtime,
      notification: {
        id: row.rowid,
        type: row.type,
        subject: row.subject_origin + row.subject_path,
        isRead: !!row.is_read
      },
      site: {
        url: row.origin,
        title: row.siteTitle
      },
      metadata: {},
      links: [],
      content: undefined
    }
    var dataKeys = row.data_keys.split(sep)
    var dataValues = row.data_values.split(sep)
    for (let i = 0; i < dataKeys.length; i++) {
      let key = dataKeys[i]
      if (key === METADATA_KEYS.content) {
        record.content = dataValues[i]
      } else if (key === METADATA_KEYS.link) {
        record.links.push(dataValues[i])
      } else {
        record.metadata[key] = dataValues[i]
      }
    }
    return record
  })
}

export async function setNotificationIsRead (rowid, isRead) {
  await db('notifications').update({is_read: isRead ? 1 : 0}).where({rowid})
}

// internal methods
// =

/**
 * @returns {Promise<void>}
 */
async function tick () {
  try {
    var release = await lock('beaker-indexer')

    var myOrigins = await listMyOrigins()

    var originsToIndex = await listOriginsToIndex()
    for (let origin of originsToIndex) {
      try {
        let site = await loadSite(origin)
        if (site.current_version === site.last_indexed_version) continue
        logger.silly(`Indexing ${origin} [ v${site.last_indexed_version} -> v${site.current_version} ]`)
        let updates = await site.listUpdates()
        logger.silly(`${updates.length} updates found for ${origin}`)
        if (updates.length === 0) continue
        for (let update of updates) {
          if (update.remove) {
            let res = await db('resources').del().where({site_rowid: site.rowid, path: update.path})
            if (+res > 0) {
              logger.silly(`Deindexed ${site.origin}${update.path} [${this.id}]`, {site: site.origin, path: update.path})
            }
          } else {
            for (let indexer of INDEXES) {
              await indexer.index(db, site, update, myOrigins)
            }
          }
        }
        await updateIndexState(site)
        logger.debug(`Indexed ${origin} [ v${site.last_indexed_version} -> v${site.current_version} ]`)
      } catch (e) {
        logger.error(`Failed to index site ${origin}. ${e.toString()}`, {site: origin, error: e.toString()})
      }
    }

    var originsToDeindex = await listOriginsToDeindex()
    for (let origin of originsToDeindex) {
      try {
        let siteRecord = await db('sites').select('*').where({origin})
        await db('resources').del().where({site_rowid: siteRecord.rowid})
        await db('site_subscriptions').del().where({site_rowid: siteRecord.rowid})
        logger.debug(`Deindexed ${siteRecord.origin}/*`, {site: siteRecord.origin})
      } catch (e) {
        logger.error(`Failed to de-index site ${origin}. ${e.toString()}`, {site: origin, error: e.toString()})
      }
    }
  } finally {
    release()
    setTimeout(tick, TICK_INTERVAL)
  }
}

/**
 * @returns {Promise<String[]>}
 */
async function listMyOrigins () {
  let driveMetas = await filesystem.listDriveMetas()
  return ['hyper://system'].concat(driveMetas.filter(dm => dm.writable).map(dm => parseUrl(dm.url).origin))
}

/**
 * @returns {Promise<String[]>}
 */
async function listOriginsToIndex () {
  var fs = filesystem.get()
  var [drivesJson, addressBookJson] = await Promise.all([
    fs.pda.readFile('/drives.json', 'json'),
    fs.pda.readFile('/address-book.json', 'json')
  ])
  return [
    'hyper://system',
    ...addressBookJson.profiles.map(item => 'hyper://' + item.key),
    ...addressBookJson.contacts.map(item => 'hyper://' + item.key),
    ...drivesJson.drives.map(item => 'hyper://' + item.key)
  ]
}

/**
 * @param {String} origin
 * @returns {Promise<SubscribedSite>}
 */
async function loadSite (origin) {
  var drive = await drives.getOrLoadDrive(origin)
  var driveInfo = await drives.getDriveInfo(origin)

  if (!driveInfo || driveInfo.version === 0) {
    throw new Error('Failed to load drive from the network')
  }

  var record = undefined
  var res = await db('sites')
    .select('sites.rowid as rowid', 'site_subscriptions.last_indexed_version as last_indexed_version')
    .leftJoin('site_subscriptions', 'sites.rowid', 'site_subscriptions.site_rowid')
    .where({origin})
  if (res[0]) {
    record = {
      rowid: res[0].rowid,
      last_indexed_version: res[0].last_indexed_version
    }
  } else {
    res = await db('sites').insert({
      origin,
      title: driveInfo.title
    })
    record = {rowid: res[0], last_indexed_version: 0}
  }

  return {
    origin,
    rowid: record.rowid,
    last_indexed_version: record.last_indexed_version,
    current_version: driveInfo.version,
    title: driveInfo.title,

    async fetch (path) {
      return drive.pda.readFile(path, 'utf8')
    },

    async listUpdates () {
      return timer(READ_TIMEOUT, async (checkin) => {
        checkin('fetching recent updates')
        let changes = await drive.pda.diff(record.last_indexed_version)
        // TODO removeme
        if (origin === 'hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39') {
          while (changes.length < 200) {
            changes = await drive.pda.diff(record.last_indexed_version)
          }
        }
        return changes.filter(change => ['put', 'del'].includes(change.type)).map(change => ({
          path: '/' + change.name,
          remove: change.type === 'del',
          metadata: change?.value?.stat?.metadata,
          ctime: change?.value?.stat?.ctime,
          mtime: change?.value?.stat?.mtime
        }))
      })
    }
  }
}

/**
 * @returns {Promise<String[]>}
 */
async function listOriginsToDeindex () {
  return [] // TODO
}

/**
 * @param {SubscribedSite} site 
 * @returns {Promise<void>}
 */
async function updateIndexState (site) {
  await db('site_subscriptions').insert({
    site_rowid: site.rowid,
    last_indexed_version: site.current_version,
    last_indexed_ts: Date.now()
  }).onConflictDoUpdate('site_rowid', {
    last_indexed_version: site.current_version,
    last_indexed_ts: Date.now()
  })
}