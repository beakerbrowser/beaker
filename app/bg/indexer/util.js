import promisePool from 'tiny-promise-pool'
import { timer } from '../../lib/time'
import { joinPath, parseSimplePathSpec } from '../../lib/strings'
import { normalizeOrigin } from '../../lib/urls'
import * as filesystem from '../filesystem/index'
import * as drives from '../hyper/drives'
import { query } from '../filesystem/query'
import { READ_TIMEOUT } from './const'

// typedefs
// =

/**
 * @typedef {import('./const').Site} Site
 * @typedef {import('./const').SiteDescription} SiteDescription
 * @typedef {import('./const').RecordUpdate} RecordUpdate
 * @typedef {import('./const').ParsedUrl} ParsedUrl
 * @typedef {import('./const').RecordDescription} RecordDescription
 * @typedef {import('../filesystem/query').FSQueryResult} FSQueryResult
 * @typedef {import('../../lib/session-permissions').EnumeratedSessionPerm} EnumeratedSessionPerm
 */

// exported api
// =

/**
 * @param {Object} db
 * @returns {Promise<Boolean>}
 */
export async function getIsFirstRun (db) {
  var res = await db('sites').select(db.raw(`count(sites.rowid) as count`))
  return !res || !res[0] || !res[0].count
}

/**
 * @param {Object} db
 * @param {String} origin 
 * @returns {Promise<Object[]>}
 */
export async function getIndexState (db, origin) {
  return await db('sites')
    .select('origin', 'last_indexed_version', 'last_indexed_ts')
    .where({origin})
    .andWhere('last_indexed_version', '>', 0)
}

/**
 * @param {Object} db
 * @param {Site} site 
 * @returns {Promise<void>}
 */
export async function updateIndexState (db, site) {
  await db('sites').update({
    last_indexed_version: site.current_version,
    last_indexed_ts: Date.now()
  }).where({origin: site.origin})
}

/**
 * @returns {Promise<String[]>}
 */
export async function listMyOrigins () {
  let driveMetas = await filesystem.listDriveMetas()
  return ['hyper://private'].concat(driveMetas.filter(dm => dm.writable).map(dm => normalizeOrigin(dm.url)))
}


/**
 * @param {Object} db
 * @returns {Promise<String[]>}
 */
export async function listOriginsToIndex (db) {
  var fs = filesystem.get()
  var addressBookJson = await fs.pda.readFile('/address-book.json', 'json')
  var subscriptions = await db('records')
    .select('records_data.value as href')
    .innerJoin('sites', 'records.site_rowid', 'sites.rowid')
    .innerJoin('records_data', function () {
      this.on('records_data.record_rowid', 'records.rowid')
        .andOn('records_data.key', db.raw('?', ['href']))
    })
    .where({
      prefix: '/subscriptions',
      extension: '.goto'
    })
    .whereIn('origin', [
      'hyper://private',
      ...addressBookJson.profiles.map(item => 'hyper://' + item.key)
    ])
  var origins = new Set([
    'hyper://private',
    ...addressBookJson.profiles.map(item => 'hyper://' + item.key),
    ...subscriptions.map(sub => normalizeOrigin(sub.href))
  ])
  return Array.from(origins)
}

/**
 * @returns {Promise<String[]>}
 */
export async function listOriginsToCapture () {
  var fs = filesystem.get()
  var drivesJson = await fs.pda.readFile('/drives.json', 'json')
  return drivesJson.drives.map(item => 'hyper://' + item.key)
}

/**
 * @param {Object} db
 * @param {String[]} originsToIndex
 * @returns {Promise<String[]>}
 */
export async function listOriginsToDeindex (db, originsToIndex) {
  var indexedSites = await db('sites')
    .select('sites.origin')
    .where('last_indexed_version', '>', 0)
  return indexedSites
    .map(row => normalizeOrigin(row.origin))
    .filter(origin => !originsToIndex.includes(origin))
}

/**
 * @param {Object} db
 * @param {String} origin
 * @returns {Promise<Site>}
 */
export async function loadSite (db, origin) {
  var drive, driveInfo
  await timer(READ_TIMEOUT, async (checkin) => {
    checkin('loading hyperdrive from the network')
    drive = await drives.getOrLoadDrive(origin)
    checkin('reading hyperdrive information from the network')
    driveInfo = await drives.getDriveInfo(origin)
  })

  if (!driveInfo || driveInfo.version === 0) {
    throw new Error('Failed to load hyperdrive from the network')
  }

  var record = undefined
  var res = await db('sites')
    .select('sites.rowid as rowid', 'last_indexed_version', 'last_indexed_ts')
    .where({origin})
  if (!res[0]) {
    res = await db('sites').insert({
      origin,
      title: driveInfo.title,
      description: driveInfo.description,
      writable: driveInfo.writable ? 1 : 0
    })
    record = {rowid: res[0], last_indexed_version: 0, last_indexed_ts: undefined}
  } else {
    record = {
      rowid: res[0].rowid,
      last_indexed_version: res[0].last_indexed_version,
      last_indexed_ts: res[0].last_indexed_ts,
    }
    /*dont await*/ db('sites').update({
      title: driveInfo.title,
      description: driveInfo.description,
      writable: driveInfo.writable ? 1 : 0
    }).where({origin})
  }

  var site = {
    origin,
    rowid: record.rowid,
    current_version: driveInfo.version,
    last_indexed_version: record.last_indexed_version,
    last_indexed_ts: record.last_indexed_ts,
    title: driveInfo.title,
    description: driveInfo.description,
    writable: driveInfo.writable,

    async stat (path) {
      return drive.pda.stat(path)
    },

    async fetch (path) {
      return drive.pda.readFile(path, 'utf8')
    },

    async listUpdates () {
      return timer(READ_TIMEOUT, async (checkin) => {
        checkin('fetching recent updates')
        // HACK work around the diff stream issue -prf
        // let changes = await drive.pda.diff(+record.last_indexed_version || 0)
        let changes = []
        for (let i = 0; i < 10; i++) {
          let c = await drive.pda.diff(+site.last_indexed_version || 0)
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

    async listMatchingFiles (pathQuery) {
      if (pathQuery) {
        return query(drive, {path: toArray(pathQuery)})
      }
      let files = await drive.pda.readdir('/', {includeStats: true, recursive: true})
      return files.map(file => ({
        url: joinPath(drive.url, file.name),
        path: '/' + file.name,
        stat: file.stat
      }))
    }
  }
  return site
}

/**
 * @param {Object} opts
 * @param {String|String[]} [opts.path]
 * @param {Object} [permissions]
 * @param {EnumeratedSessionPerm[]} [permissions.query]
 */
export function checkShouldExcludePrivate (opts, permissions) {
  var shouldExcludePrivate = false
  if (permissions?.query) {
    shouldExcludePrivate = true
    // only include private if the query 100% matches permissions
    if (opts?.path) {
      shouldExcludePrivate = false
      for (let path of toArray(opts.path)) {
        let pathSpec = parseSimplePathSpec(path)
        let match = permissions.query.find(perm => (
          perm.prefix === pathSpec.prefix && 
          (!perm.extension || perm.extension === pathSpec.extension)
        ))
        if (!match) {
          shouldExcludePrivate = true
          break
        }
      }
    }
  }
  return shouldExcludePrivate
}

/**
 * @param {String} url
 * @param {String} [base]
 * @returns {ParsedUrl}
 */
export function parseUrl (url, base = undefined) {
  let {protocol, hostname, port, pathname, search, hash} = new URL(url, base)
  return {
    origin: `${protocol}//${hostname}${(port ? `:${port}` : '')}`,
    path: pathname + search + hash,
    pathname
  }
}

const IS_URL_RE = /^[\S]*:\/\/[\S]*$/
/**
 * @param {String} v 
 * @returns {Boolean}
 */
export function isUrl (v) {
  return IS_URL_RE.test(v)
}

export function toArray (v) {
  return Array.isArray(v) ? v : [v]
}

export function parallel (arr, fn, ...args) {
  return promisePool({
    threads: 10,
    promises: ({index}) => index < arr.length ? fn(arr[index], ...args) : null
  })
}

