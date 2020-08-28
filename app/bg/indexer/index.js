/**
 * The indexer creates the following datasets:
 * 
 *  - List of sites that have been indexed
 *  - List of records that have been indexed
 *  - Metadata & file content for all indexed records (including FTS index)
 *  - Notifications for records which are relevant to the user
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
import { query } from '../filesystem/query'
import * as logLib from '../logger'
const logger = logLib.get().child({category: 'indexer'})
import { TICK_INTERVAL, READ_TIMEOUT, METADATA_KEYS, INDEX_IDS, parseUrl } from './const'
import { INDEXES } from './index-defs'
import lock from '../../lib/lock'
import { timer } from '../../lib/time'
import { chunkMapAsync } from '../../lib/functions'

/**
 * @typedef {import('./const').Site} Site
 * @typedef {import('./const').SiteDescription} SiteDescription
 * @typedef {import('./const').RecordUpdate} RecordUpdate
 * @typedef {import('./const').ParsedUrl} ParsedUrl
 * @typedef {import('./const').RecordDescription} RecordDescription
 * @typedef {import('../filesystem/query').FSQueryResult} FSQueryResult
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
 * @returns {Promise<SiteDescription>}
 */
export async function getSite (url) {
  var origin = normalizeOrigin(url)
  if (!origin.startsWith('hyper://')) return undefined // hyper only for now
  var siteRows = await db('sites').select('*').where({origin}).limit(1)
  if (siteRows[0]) {
    return {
      origin: siteRows[0].origin,
      url: siteRows[0].origin,
      title: siteRows[0].title,
      description: siteRows[0].description,
      writable: Boolean(siteRows[0].writable)
    }
  }
  var site = await loadSite(origin)
  return {
    origin: site.origin,
    url: site.origin,
    title: site.title,
    description: site.description,
    writable: site.writable
  }
}

/**
 * @param {Object} [opts]
 * @param {Object} [opts.filter]
 * @param {String} [opts.filter.search]
 * @param {Boolean} [opts.filter.writable]
 * @param {Number} [opts.offset]
 * @param {Number} [opts.limit]
 * @returns {Promise<SiteDescription[]>}
 */
export async function listSites (opts) {
  var query = db('sites')
    .select('*')
    .offset(opts?.offset || 0)
    .limit(opts?.limit || 25)
  if (opts?.filter?.search) {
    query = query.whereRaw(
      `sites.title LIKE ? OR sites.description LIKE ?`,
      [`%${opts.filter.search}%`, `%${opts.filter.search}%`]
    )
  }
  if (typeof opts?.filter?.writable === 'boolean') {
    query = query.where('sites.writable', opts.filter.writable ? 1 : 0)
  }
  var siteRows = await query
  return siteRows.map(row => ({
    origin: row.origin,
    url: row.origin,
    title: row.title,
    description: row.description,
    writable: Boolean(row.writable)
  }))
}

/**
 * @param {String} url 
 * @returns {Promise<RecordDescription>}
 */
export async function getRecord (url) {
  let urlp = parseUrl(url)
  var rows = await db('sites')
    .leftJoin('records', 'sites.rowid', 'records.site_rowid')
    .select('*', 'records.rowid as record_rowid')
    .where({
      'origin': urlp.origin,
      'path': urlp.path
    })
    .limit(1)
  if (!rows[0]) {
    return getLiveRecord(urlp.origin, urlp.path)
  }

  var record_rowid = rows[0].record_rowid
  var result = {
    url: urlp.origin + urlp.path,
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

  rows = await db('records_data').select('*').where({record_rowid})
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

/**
 * @param {Object} [opts]
 * @param {Object} [opts.filter]
 * @param {String|Array<String>} [opts.filter.site]
 * @param {String|Array<String>} [opts.filter.index]
 * @param {String} [opts.filter.linksTo]
 * @param {String} [opts.sort]
 * @param {Number} [opts.offset]
 * @param {Number} [opts.limit]
 * @param {Boolean} [opts.reverse]
 * @returns {Promise<RecordDescription[]>}
 */
export async function listRecords (opts) {
  var sort = 'ctime'
  var reverse = (typeof opts?.reverse === 'boolean') ? opts.reverse : true
  if (opts?.sort && ['ctime', 'mtime', 'site'].includes(opts.sort)) {
    sort = opts.sort
  }
  var offset = opts?.offset || 0
  var limit = opts?.limit || 25
  var sep = `[>${Math.random()}<]`
  var query = db('sites')
    .innerJoin('records', 'sites.rowid', 'records.site_rowid')
    .leftJoin('records_data', function() {
      this.on('records.rowid', '=', 'records_data.record_rowid').onNotNull('records_data.value')
    })
    .select(
      'origin',
      'path',
      'index',
      'ctime',
      'mtime',
      'title as siteTitle',
      db.raw(`group_concat(records_data.key, '${sep}') as data_keys`),
      db.raw(`group_concat(records_data.value, '${sep}') as data_values`),
    )
    .groupBy('records.rowid')
    .offset(offset)
    .limit(limit)
    .orderBy(sort, reverse ? 'desc' : 'asc')

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
  if (opts?.filter?.linksTo) {
    query = query.joinRaw(
      `INNER JOIN records_data as link ON link.record_rowid = records.rowid AND link.value = ?`,
      [opts.filter.linksTo]
    )
  }

  var indexStatesQuery
  if (opts?.filter?.site && !opts?.filter?.linksTo) {
    // fetch info on whether each given site has been indexed
    indexStatesQuery = db('sites')
      .select('origin')
      .innerJoin('site_indexes', 'site_indexes.site_rowid', 'sites.rowid')
      .groupBy('sites.rowid')
    if (Array.isArray(opts.filter.site)) {
      indexStatesQuery = indexStatesQuery.whereIn('origin', opts.filter.site.map(site => parseUrl(site).origin))
    } else {
      indexStatesQuery = indexStatesQuery.where({origin: parseUrl(opts.filter.site).origin})
    }
  }

  var [rows, indexStates] = await Promise.all([
    query,
    indexStatesQuery
  ])

  var records = rows.map(row => {
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

  // fetch live data for each site not present in the db
  if (indexStates) {
    // fetch the live records
    var addedRecords
    for (let site of toArray(opts.filter.site)) {
      let origin = parseUrl(site).origin
      if (indexStates.find(state => state.origin === origin)) {
        continue
      }
      addedRecords = (addedRecords || []).concat(
        await listLiveRecords(origin, {filter: opts?.filter})
      )
    }
    if (addedRecords) {
      // merge and sort
      records = records.concat(addedRecords)
      records.sort((a, b) => {
        if (sort === 'ctime') {
          return reverse ? (b.ctime - a.ctime) : (a.ctime - b.ctime)
        } else if (sort === 'mtime') {
          return reverse ? (b.mtime - a.mtime) : (a.mtime - b.mtime)
        } else if (sort === 'site') {
          return b.site.url.localeCompare(a.site.url) * (reverse ? -1 : 1)
        }
      })
      records = records.slice(offset, offset + limit)

      // load data as needed
      for (let record of records) {
        if (record.fetchData) {
          await record.fetchData()
          delete record.fetchData
        }
      }
    }
  }

  return records
}


/**
 * @param {Object} [opts]
 * @param {Object} [opts.filter]
 * @param {String|Array<String>} [opts.filter.site]
 * @param {String|Array<String>} [opts.filter.index]
 * @param {String} [opts.filter.linksTo]
 * @returns {Promise<Object<String, Number>>}
 */
export async function countRecords (opts) {
  var query = db('records')
    .innerJoin('sites', 'sites.rowid', 'records.site_rowid')
    .select('index', db.raw(`count(records.rowid) as count`))
    .groupBy('records.index')

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
  if (opts?.filter?.linksTo) {
    query = query.joinRaw(
      `INNER JOIN records_data as link ON link.record_rowid = records.rowid AND link.value = ?`,
      [opts.filter.linksTo]
    )
  }

  var indexStatesQuery
  if (opts?.filter?.site && !opts?.filter?.linksTo) {
    // fetch info on whether each given site has been indexed
    indexStatesQuery = db('sites')
      .select('origin')
      .innerJoin('site_indexes', 'site_indexes.site_rowid', 'sites.rowid')
      .groupBy('sites.rowid')
    if (Array.isArray(opts.filter.site)) {
      indexStatesQuery = indexStatesQuery.whereIn('origin', opts.filter.site.map(site => parseUrl(site).origin))
    } else {
      indexStatesQuery = indexStatesQuery.where({origin: parseUrl(opts.filter.site).origin})
    }
  }

  var [rows, indexStates] = await Promise.all([
    query,
    indexStatesQuery
  ])

  var counts = {}
  for (let row of rows) {
    counts[row.index] = row.count
  }

  // fetch live data for each site not present in the db
  if (indexStates) {
    for (let site of toArray(opts.filter.site)) {
      let origin = parseUrl(site).origin
      if (indexStates.find(state => state.origin === origin)) {
        continue
      }
      let files = await listLiveRecords(origin, {filter: opts?.filter})
      for (let file of files) {
        counts[file.index] = (counts[file.index] || 0) + 1
      }
    }
  }

  return counts
}

/**
 * @param {String} [q]
 * @param {Object} [opts]
 * @param {Object} [opts.filter]
 * @param {String|Array<String>} [opts.filter.site]
 * @param {String|Array<String>} [opts.filter.index]
 * @param {String} [opts.sort]
 * @param {Number} [opts.offset]
 * @param {Number} [opts.limit]
 * @param {Boolean} [opts.reverse]
 * @returns {Promise<RecordDescription[]>}
 */
export async function searchRecords (q = '', opts) {
  // prep search terms
  q = q
    .toLowerCase()
    .replace(/[:^*]/g, '') // strip symbols that sqlite interprets
    .replace(/[-]/g, ' ') // strip symbols that sqlite interprets
    + '*' // allow partial matches

  var query = db('records_data_fts')
    .select(
      'origin',
      'path',
      'index',
      'ctime',
      'mtime',
      'title as siteTitle',
      'record_rowid',
      'key',
      'rank',
      db.raw(`snippet(records_data_fts, 0, '<b>', '</b>', '...', 30) as matchingText`)
    )
    .innerJoin('records_data', 'records_data.rowid', 'records_data_fts.rowid')
    .innerJoin('records', 'records.rowid', 'records_data.record_rowid')
    .innerJoin('sites', 'sites.rowid', 'records.site_rowid')
    .whereIn('records_data.key', ['content', 'title'])
    .whereRaw(`records_data_fts.value MATCH ?`, [q])
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

  if (opts?.sort && ['ctime', 'mtime'].includes(opts.sort)) {
    query = query.orderBy(opts.sort, opts.reverse ? 'desc' : 'asc')
  } else {
    query = query.orderBy('rank', 'desc')
  }

  var hits = await query

  // merge hits on the same record
  var mergedHits = {}
  for (let hit of hits) {
    mergedHits[hit.record_rowid] = mergedHits[hit.record_rowid] || []
    mergedHits[hit.record_rowid].push(hit)
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

    var rows = await db('records_data').select('*').where({record_rowid: mergedHits[0].record_rowid})
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

/**
 * @param {Object} [opts]
 * @param {Object} [opts.filter]
 * @param {String|Array<String>} [opts.filter.site]
 * @param {String|Array<String>} [opts.filter.subject]
 * @param {String|Array<String>} [opts.filter.index]
 * @param {String|Array<String>} [opts.filter.type]
 * @param {String} [opts.filter.search]
 * @param {Boolean} [opts.filter.isRead]
 * @param {String} [opts.sort]
 * @param {Number} [opts.offset]
 * @param {Number} [opts.limit]
 * @param {Boolean} [opts.reverse]
 * @returns {Promise<RecordDescription[]>}
 */
export async function listNotifications (opts) {
  var sep = `[>${Math.random()}<]`
  var query = db('notifications')
    .leftJoin('sites', 'sites.rowid', 'notifications.site_rowid')
    .leftJoin('records', 'records.rowid', 'notifications.record_rowid')
    .leftJoin('records_data', function() {
      this.on('records.rowid', '=', 'records_data.record_rowid').onNotNull('records_data.value')
    })
    .select(
      'notifications.rowid as rowid',
      'origin',
      'path',
      'index',
      'notifications.rtime',
      'ctime',
      'mtime',
      'title as siteTitle',
      'type',
      'subject_origin',
      'subject_path',
      'is_read',
      db.raw(`group_concat(records_data.key, '${sep}') as data_keys`),
      db.raw(`group_concat(records_data.value, '${sep}') as data_values`),
    )
    .groupBy('notifications.record_rowid')
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
  if (opts?.filter?.search) {
    query = query.whereRaw(`records_data.value LIKE ?`, [`%${opts.filter.search}%`])
  }
  if (typeof opts?.filter?.isRead !== 'undefined') {
    query = query.where({is_read: opts.filter.isRead ? 1 : 0})
  }

  if (opts?.sort && ['ctime', 'mtime', 'rtime'].includes(opts.sort)) {
    query = query.orderBy(opts.sort, opts?.reverse ? 'desc' : 'asc')
  } else {
    let reverse = (typeof opts?.reverse === 'boolean') ? opts.reverse : true
    query = query.orderBy('rtime', reverse ? 'desc' : 'asc')
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
        isRead: !!row.is_read,
        rtime: row.rtime
      },
      site: {
        url: row.origin,
        title: row.siteTitle
      },
      metadata: {},
      links: [],
      content: undefined
    }
    var dataKeys = row?.data_keys?.split(sep) || []
    var dataValues = row?.data_values?.split(sep) || []
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

/**
 * @param {Object} [opts]
 * @param {Object} [opts.filter]
 * @param {String|Array<String>} [opts.filter.site]
 * @param {String|Array<String>} [opts.filter.subject]
 * @param {String|Array<String>} [opts.filter.index]
 * @param {String|Array<String>} [opts.filter.type]
 * @param {Boolean} [opts.filter.isRead]
 * @returns {Promise<Number>}
 */
export async function countNotifications (opts) {
  var query = db('notifications')
    .select(db.raw(`count(notifications.rowid) as count`))

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
  if (typeof opts?.filter?.isRead !== 'undefined') {
    query = query.where({is_read: opts.filter.isRead ? 1 : 0})
  }

  var rows = await query
  return rows[0].count
}

/**
 * @param {Number|String} rowid
 * @param {Boolean} isRead
 * @returns {Promise<void>}
 */
export async function setNotificationIsRead (rowid, isRead) {
  if (rowid === 'all') {
    await db('notifications').update({is_read: isRead ? 1 : 0})
  } else {
    await db('notifications').update({is_read: isRead ? 1 : 0}).where({rowid})
  }
}

export async function triggerSiteIndex (origin) {
  var myOrigins = await listMyOrigins()
  await indexSite(origin, myOrigins)
}

// internal methods
// =

/**
 * @returns {Promise<void>}
 */
var _isFirstRun = undefined
async function tick () {
  try {
    var myOrigins = await listMyOrigins()
    if (typeof _isFirstRun === 'undefined') {
      _isFirstRun = await getIsFirstRun()
    }

    var originsToIndex = await listOriginsToIndex()
    await chunkMapAsync(originsToIndex, 10, origin => indexSite(origin, myOrigins))

    if (_isFirstRun) {
      // immediately re-run now that we've populated with subscription records
      _isFirstRun = false
      originsToIndex = await listOriginsToIndex()
      await chunkMapAsync(originsToIndex, 10, origin => indexSite(origin, myOrigins))
    }

    var originsToCapture = await listOriginsToCapture()
    await chunkMapAsync(originsToCapture, 10, async (origin) => {
      try {
        await loadSite(origin) // this will capture the metadata of the site
      } catch {}
    })

    var originsToDeindex = await listOriginsToDeindex(originsToIndex)
    await chunkMapAsync(originsToDeindex, 10, (origin) => deindexSite(origin))
  } finally {
    setTimeout(tick, TICK_INTERVAL)
  }
}

async function indexSite (origin, myOrigins) {
  origin = normalizeOrigin(origin)
  var release = await lock(`beaker-indexer:${origin}`)
  try {
    let site = await loadSite(origin)
    for (let indexer of INDEXES) {
      let idxState = site.indexes[indexer.id]
      if (site.current_version === idxState.last_indexed_version) {
        continue
      }

      logger.silly(`Indexing ${origin} [ v${idxState.last_indexed_version} -> v${site.current_version} ] [ ${indexer.id} ]`)
      let updates = await site.listUpdates(indexer.id)
      logger.silly(`${updates.length} updates found for ${origin} [ ${indexer.id} ]`)
      if (updates.length === 0) continue
      for (let update of updates) {
        if (update.remove) {
          let res = await db('records').select('rowid').where({
            site_rowid: site.rowid,
            path: update.path
          })
          if (res[0]) await db('records_data').del().where({record_rowid: res[0].rowid})
          res = await db('records').del().where({site_rowid: site.rowid, path: update.path})
          if (+res > 0) {
            logger.silly(`Deindexed ${site.origin}${update.path} [${indexer.id}]`, {site: site.origin, path: update.path})
          }
        } else {
          await indexer.index(db, site, update, myOrigins)
        }
      }
      await updateIndexState(site, indexer.id)
      logger.debug(`Indexed ${origin} [ v${idxState.last_indexed_version} -> v${site.current_version} ] [ ${indexer.id} ]`)
    }
  } catch (e) {
    logger.error(`Failed to index site ${origin}. ${e.toString()}`, {site: origin, error: e.toString()})
  } finally {
    release()
  }
}

async function deindexSite (origin) {
  origin = normalizeOrigin(origin)
  var release = await lock(`beaker-indexer:${origin}`)
  try {
    let site = (await db('sites').select('rowid', 'origin').where({origin}))[0]
    let records = await db('records').select('rowid').where({site_rowid: site.rowid})
    for (let record of records) {
      await db('records_data').del().where({record_rowid: record.rowid})
    }
    await db('records').del().where({site_rowid: site.rowid})
    await db('notifications').del().where({site_rowid: site.rowid})
    await db('site_indexes').del().where({site_rowid: site.rowid})
    logger.debug(`Deindexed ${site.origin}/*`, {site: site.origin})
  } catch (e) {
    logger.error(`Failed to de-index site ${origin}. ${e.toString()}`, {site: origin, error: e.toString()})
  } finally {
    release()
  }
}

/**
 * @param {String} [origin]
 * @param {String} [path]
 * @returns {Promise<RecordDescription>}
 */
async function getLiveRecord (origin, path) {
  if (!origin.startsWith('hyper://')) {
    return undefined // hyper only for now
  }
  let url = origin + path
  try {
    let site = await loadSite(origin)
    let stat = await site.stat(path)
    let update = {
      remove: false,
      path,
      metadata: stat.metadata,
      ctime: stat.ctime,
      mtime: stat.mtime
    }
    for (let indexer of INDEXES) {
      if (!indexer.filter(update)) {
        continue
      }
      logger.silly(`Live-fetching ${url} [ ${indexer.id} ]`)
      var record = {
        url,
        index: indexer.id,
        ctime: +stat.ctime,
        mtime: +stat.mtime,
        site: {
          url: site.origin,
          title: site.title
        },
        metadata: {},
        links: [],
        content: undefined
      }
      for (let [key, value] of await indexer.getData(site, update)) {
        if (key === METADATA_KEYS.content) {
          record.content = value
        } if (key === METADATA_KEYS.link) {
          record.links.push(value)
        } else {
          record.metadata[key] = value
        }
      }
      return record
    }
  } catch (e) {
    logger.error(`Failed to live-fetch file ${url}. ${e.toString()}`, {site: origin, error: e.toString()})
  }  
  return undefined
}

/**
 * @param {Object} [opts]
 * @param {Object} [opts.filter]
 * @param {String|Array<String>} [opts.filter.index]
 * @returns {Promise<RecordDescription[]>}
 */
async function listLiveRecords (origin, opts) {
  var records = []
  var indexFilter = opts?.filter?.index ? toArray(opts.filter.index) : undefined
  try {
    let site = await loadSite(origin)
    await Promise.all(INDEXES.map(async (indexer) => {
      if (indexFilter && !indexFilter.includes(indexer.id)) {
        return
      }
      logger.silly(`Live-querying ${origin} [ ${indexer.id} ]`)
      let files = await site.listMatchingFiles(indexer)
      records = records.concat(files.map(file => {
        return {
          url: file.url,
          index: indexer.id,
          ctime: +file.stat.ctime,
          mtime: +file.stat.mtime,
          site: {
            url: site.origin,
            title: site.title
          },
          metadata: file.stat.metadata,
          links: [],
          content: undefined,

          // helper to fetch the rest of the data if in the results set
          fetchData: async function () {
            let update = {
              remove: false,
              path: file.path,
              metadata: file.stat.metadata,
              ctime: file.stat.ctime,
              mtime: file.stat.mtime
            }
            for (let [key, value] of await indexer.getData(site, update)) {
              if (key === METADATA_KEYS.content) {
                this.content = value
              } if (key === METADATA_KEYS.link) {
                this.links.push(value)
              } else {
                this.metadata[key] = value
              }
            }
          }
        }
      }))
    }))
  } catch (e) {
    logger.error(`Failed to live-query site ${origin}. ${e.toString()}`, {site: origin, error: e.toString()})
  }  
  return records
}

/**
 * @returns {Promise<Boolean>}
 */
async function getIsFirstRun () {
  var res = await db('site_indexes').select(db.raw(`count(site_indexes.rowid) as count`))
  return !res || !res[0] || !res[0].count
}

/**
 * @returns {Promise<String[]>}
 */
async function listMyOrigins () {
  let driveMetas = await filesystem.listDriveMetas()
  return ['hyper://private'].concat(driveMetas.filter(dm => dm.writable).map(dm => parseUrl(dm.url).origin))
}

/**
 * @returns {Promise<String[]>}
 */
async function listOriginsToIndex () {
  var fs = filesystem.get()
  var addressBookJson = await fs.pda.readFile('/address-book.json', 'json')
  var subscriptions = await listRecords({
    filter: {
      index: INDEX_IDS.subscriptions,
      site: ['hyper://private', ...addressBookJson.profiles.map(item => 'hyper://' + item.key)]
    },
    limit: 1e9
  })
  var origins = new Set([
    'hyper://private',
    ...addressBookJson.profiles.map(item => 'hyper://' + item.key),
    ...subscriptions.map(sub => normalizeOrigin(sub.metadata[METADATA_KEYS.href]))
  ])
  return Array.from(origins)
}

/**
 * @returns {Promise<String[]>}
 */
async function listOriginsToCapture () {
  var fs = filesystem.get()
  var drivesJson = await fs.pda.readFile('/drives.json', 'json')
  return drivesJson.drives.map(item => 'hyper://' + item.key)
}

/**
 * @param {String} origin
 * @returns {Promise<Site>}
 */
async function loadSite (origin) {
  var drive, driveInfo
  await timer(READ_TIMEOUT, async (checkin) => {
    checkin('Loading hyperdrive from the network')
    drive = await drives.getOrLoadDrive(origin)
    checkin('Reading hyperdrive information from the network')
    driveInfo = await drives.getDriveInfo(origin)
  })

  if (!driveInfo || driveInfo.version === 0) {
    throw new Error('Failed to load hyperdrive from the network')
  }

  var record = undefined
  var res = await db('sites')
    .select('sites.rowid as rowid', 'site_indexes.index', 'site_indexes.last_indexed_version as last_indexed_version')
    .leftJoin('site_indexes', 'sites.rowid', 'site_indexes.site_rowid')
    .where({origin})
  if (!res[0]) {
    res = await db('sites').insert({
      origin,
      title: driveInfo.title,
      description: driveInfo.description,
      writable: driveInfo.writable ? 1 : 0
    })
    record = {rowid: res[0], indexes: {}}
  } else {
    record = {
      rowid: res[0].rowid,
      indexes: {}
    }
    for (let row of res) {
      record.indexes[row.index] = {
        index: row.index,
        last_indexed_version: row.last_indexed_version
      }
    }
    /*dont await*/ db('sites').update({
      title: driveInfo.title,
      description: driveInfo.description,
      writable: driveInfo.writable ? 1 : 0
    }).where({origin})
  }

  for (let indexer of INDEXES) {
    if (!record.indexes[indexer.id]) {
      record.indexes[indexer.id] = {
        index: indexer.id,
        last_indexed_version: 0
      }
    }
  }

  var site = {
    origin,
    rowid: record.rowid,
    indexes: record.indexes,
    current_version: driveInfo.version,
    title: driveInfo.title,
    description: driveInfo.description,
    writable: driveInfo.writable,

    async stat (path) {
      return drive.pda.stat(path)
    },

    async fetch (path) {
      return drive.pda.readFile(path, 'utf8')
    },

    async listUpdates (indexId) {
      return timer(READ_TIMEOUT, async (checkin) => {
        checkin('fetching recent updates')
        // HACK work around the diff stream issue -prf
        // let changes = await drive.pda.diff(+record.last_indexed_version || 0)
        let changes = []
        for (let i = 0; i < 10; i++) {
          let c = await drive.pda.diff(+site.indexes[indexId].last_indexed_version || 0)
          if (c.length > changes.length) changes = c
        }
        return changes.filter(change => ['put', 'del'].includes(change.type)).map(change => ({
          path: '/' + change.name,
          remove: change.type === 'del',
          metadata: change?.value?.stat?.metadata,
          ctime: Number(change?.value?.stat?.ctime || 0),
          mtime: Number(change?.value?.stat?.mtime || 0)
        }))
      })
    },

    async listMatchingFiles (index) {
      return query(drive, {path: index.liveQuery})
    }
  }
  return site
}

/**
 * @param {String[]} originsToIndex
 * @returns {Promise<String[]>}
 */
async function listOriginsToDeindex (originsToIndex) {
  var indexedSites = await db('sites')
    .select('sites.origin')
    .innerJoin('site_indexes', 'sites.rowid', 'site_indexes.site_rowid')
    .where('site_indexes.last_indexed_version', '>', 0)
    .groupBy('sites.origin')
  return indexedSites
    .map(row => normalizeOrigin(row.origin))
    .filter(origin => !originsToIndex.includes(origin))
}

/**
 * @param {Site} site 
 * @param {String} index
 * @returns {Promise<void>}
 */
async function updateIndexState (site, index) {
  await db('site_indexes').insert({
    site_rowid: site.rowid,
    index,
    last_indexed_version: site.current_version,
    last_indexed_ts: Date.now()
  }).onConflictDoUpdate('`site_rowid`, `index`', {
    last_indexed_version: site.current_version,
    last_indexed_ts: Date.now()
  })
}

/**
 * @param {String} str 
 * @returns {String}
 */
function normalizeOrigin (str) {
  try {
    let urlp = new URL(str)
    return urlp.protocol + '//' + urlp.hostname
  } catch {
    // assume hyper, if this fails then bomb out
    let urlp = new URL('hyper://' + str)
    return urlp.protocol + '//' + urlp.hostname
  }
}

function toArray (v) {
  return Array.isArray(v) ? v : [v]
}