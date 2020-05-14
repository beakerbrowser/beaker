import sqlite3 from 'sqlite3'
import path from 'path'
import { parseDriveUrl } from '../../lib/urls'
import { cbPromise } from '../../lib/functions'
import { setupSqliteDB } from '../lib/db'

// globals
// =

var db
var migrations
var setupPromise

// exported methods
// =

/**
 * @param {Object} opts
 * @param {string} opts.userDataPath
 */
export function setup (opts) {
  // open database
  var dbPath = path.join(opts.userDataPath, 'SiteData')
  db = new sqlite3.Database(dbPath)
  setupPromise = setupSqliteDB(db, {migrations}, '[SITEDATA]')
}

/**
 * @param {string} url
 * @param {string} key
 * @param {number | string} value
 * @param {Object} [opts]
 * @param {boolean} [opts.dontExtractOrigin]
 * @param {boolean} [opts.normalizeUrl]
 * @returns {Promise<void>}
 */
export async function set (url, key, value, opts) {
  await setupPromise
  var origin = opts && opts.dontExtractOrigin ? url : await extractOrigin(url)
  if (!origin) return null
  if (opts && opts.normalizeUrl) origin = normalizeUrl(origin)
  return cbPromise(cb => {
    db.run(`
      INSERT OR REPLACE
        INTO sitedata (origin, key, value)
        VALUES (?, ?, ?)
    `, [origin, key, value], cb)
  })
}

/**
 * @param {string} url
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function clear (url, key) {
  await setupPromise
  var origin = await extractOrigin(url)
  if (!origin) return null
  return cbPromise(cb => {
    db.run(`
      DELETE FROM sitedata WHERE origin = ? AND key = ?
    `, [origin, key], cb)
  })
}

/**
 * @param {string} url
 * @param {string} key
 * @param {Object} [opts]
 * @param {boolean} [opts.dontExtractOrigin]
 * @param {boolean} [opts.normalizeUrl]
 * @returns {Promise<string>}
 */
export async function get (url, key, opts) {
  await setupPromise
  var origin = opts && opts.dontExtractOrigin ? url : await extractOrigin(url)
  if (!origin) return null
  if (opts && opts.normalizeUrl) origin = normalizeUrl(origin)
  return cbPromise(cb => {
    db.get(`SELECT value FROM sitedata WHERE origin = ? AND key = ?`, [origin, key], (err, res) => {
      if (err) return cb(err)
      cb(null, res && res.value)
    })
  })
}

/**
 * @param {string} url
 * @param {string} key
 * @returns {Promise<string>}
 */
export function getPermission (url, key) {
  return get(url, 'perm:' + key)
}

/**
 * @param {string} url
 * @returns {Promise<Object>}
 */
export async function getPermissions (url) {
  await setupPromise
  var origin = await extractOrigin(url)
  if (!origin) return null
  return cbPromise(cb => {
    db.all(`SELECT key, value FROM sitedata WHERE origin = ? AND key LIKE 'perm:%'`, [origin], (err, rows) => {
      if (err) return cb(err)

      // convert to a dictionary
      // TODO - pull defaults from browser settings
      var perms = { /* js: true */ }
      if (rows) rows.forEach(row => { perms[row.key.slice('5')] = row.value })
      cb(null, perms)
    })
  })
}

/**
 * @param {string} url
 * @returns {Promise<Array<string>>}
 */
export async function getNetworkPermissions (url) {
  await setupPromise
  var origin = await extractOrigin(url)
  if (!origin) return null
  return cbPromise(cb => {
    db.all(`SELECT key, value FROM sitedata WHERE origin = ? AND key LIKE 'perm:network:%'`, [origin], (err, rows) => {
      if (err) return cb(err)

      // convert to array
      var origins = /** @type string[] */([])
      if (rows) {
        rows.forEach(row => {
          if (row.value) origins.push(row.key.split(':').pop())
        })
      }
      cb(null, origins)
    })
  })
}

/**
 * @param {string} url
 * @param {string} key
 * @param {string | number} value
 * @returns {Promise<void>}
 */
export function setPermission (url, key, value) {
  value = value ? 1 : 0
  return set(url, 'perm:' + key, value)
}

/**
 * @param {string} url
 * @param {string} key
 * @returns {Promise<void>}
 */
export function clearPermission (url, key) {
  return clear(url, 'perm:' + key)
}

/**
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function clearPermissionAllOrigins (key) {
  await setupPromise
  key = 'perm:' + key
  return cbPromise(cb => {
    db.run(`
      DELETE FROM sitedata WHERE key = ?
    `, [key], cb)
  })
}

export const WEBAPI = {
  get,
  set,
  getPermissions,
  getPermission,
  setPermission,
  clearPermission,
  clearPermissionAllOrigins
}

// internal methods
// =

/**
 * @param {string} originURL
 * @returns {Promise<string>}
 */
async function extractOrigin (originURL) {
  var urlp = parseDriveUrl(originURL)
  if (!urlp || !urlp.host || !urlp.protocol) return
  return (urlp.protocol + urlp.host + (urlp.port ? `:${urlp.port}` : ''))
}

/**
 * @param {string} originURL
 * @returns {string}
 */
function normalizeUrl (originURL) {
  try {
    var urlp = new URL(originURL)
    return (urlp.protocol + '//' + urlp.hostname + (urlp.port ? `:${urlp.port}` : '') + urlp.pathname).replace(/([/]$)/g, '')
  } catch (e) {}
  return originURL
}

migrations = [
  // version 1
  // - includes favicons for default bookmarks
  function (cb) {
    db.exec(`
      CREATE TABLE sitedata(
        origin NOT NULL,
        key NOT NULL,
        value
      );
      CREATE UNIQUE INDEX sitedata_origin_key ON sitedata (origin, key);
      INSERT OR REPLACE INTO "sitedata" VALUES('https:duckduckgo.com','favicon','data:image/png;base64,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');
      PRAGMA user_version = 1;
    `, cb)
  },
  // version 2
  // - more favicons for default bookmarks (removed)
  function (cb) {
    db.exec(`PRAGMA user_version = 2;`, cb)
  },
  // version 3
  // - more favicons for default bookmarks (removed)
  function (cb) {
    db.exec(`PRAGMA user_version = 3;`, cb)
  },
  // version 4
  // - more favicons for default bookmarks (removed)
  function (cb) {
    db.exec(`PRAGMA user_version = 4;`, cb)
  },
  // version 5
  // - more favicons for default bookmarks (removed)
  function (cb) {
    db.exec(`PRAGMA user_version = 5;`, cb)
  },
  // version 6
  // - more favicons (removed)
  function (cb) {
    db.exec(`PRAGMA user_version = 6;`, cb)
  },
  // version 7
  // - more favicons
  function (cb) {
    db.exec(`
      INSERT OR REPLACE INTO "sitedata" VALUES('https:beaker.network','favicon','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACXklEQVQ4T6WTPWgTYRjH/88ladCI1RQKVScLDtl0UelSnZQWETFTsdQkipg7paWDupy3iILY4T76QVKjOJl2EqRTEXQoDgqCgoNCQFGwKLUfJrm795H3kisnddJ3ufde/u/v/T9fhP9cFLkv9yz/x8fPpRqN5G5mZYei+PFm0/1BlNqIx3/6jUaKenp61g3D8KQ2BGxeVtVCP4NvAzgcNUfAF4DfALQXoKuWVVqMAgKtqubyDCoR0AR4npneAXCJKMPgAQBd0iWB71jW7I3Wvr1UNd/HwAsCPggB1XHKC1EHmlY4Ihg2wIcIcIi2j5mm2QgAmqYlBa/PATTIhFOOWX4iz9Lpr0FOarWUUqlU6i0IL4BRY072OY6zFgCKxeEuUGIZwFPbKg/ouh4HIAzDEG0XNDIykpQQVS08YPCw8EXv5OT9j20H+YOC8YpApmWVrsjXpb1oCLqe7TCMarNYzF8H4RYLnJRhtgHnM4KVt2BM23b50t8A4Zmq5nQG3STQMcsqPQsAo6P5tOviG0DP19a8E9KqDCOsdTabjWUyiLUc5KogOut77r6pqYefA4AULy9/mgYhB6bLtl2aDJMrv6ZpNmXJNK1wRjDPE3gxkVgdnJio/tosY7F44QBIvAQQA9M111UezczMrLQcZrc1vM7TxHwXwB6F6Khplpa2dKKqFo4DXGUgTcASA+/B8EHYD6CfAI+Zh2x79nGY4C2trGkXe5n9MQaGAHS2hXUC5ohwzzTLr8PS/tGJkblgXdeVlZXazjqwK+F3xDwv9r27u3s1TGpbGzRZdBr/abB/AxcoGCCqR8KvAAAAAElFTkSuQmCC');
      INSERT OR REPLACE INTO "sitedata" VALUES('https:hyperdrive.network','favicon','data:image/png;base64,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');
      PRAGMA user_version = 7;
   `, cb)
  }
]
