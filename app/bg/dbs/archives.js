import path from 'path'
import url from 'url'
import mkdirp from 'mkdirp'
import Events from 'events'
import datEncoding from 'dat-encoding'
import jetpack from 'fs-jetpack'
import { InvalidArchiveKeyError } from 'beaker-error-constants'
import * as db from './profile-data-db'
import lock from '../../lib/lock'
import { HYPERDRIVE_HASH_REGEX } from '../../lib/const'
import * as hyperDns from '../hyper/dns'

// typedefs
// =

/**
 * @typedef {import('../dat/daemon').DaemonHyperdrive} DaemonHyperdrive
 *
 * @typedef {Object} LibraryArchiveMeta
 * @prop {string} key
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 * @prop {string} type
 * @prop {string} memberOf
 * @prop {number} mtime
 * @prop {number} size
 * @prop {string} author
 * @prop {string} forkOf
 * @prop {boolean} writable
 * @prop {number} lastAccessTime
 * @prop {number} lastLibraryAccessTime
 *
 * @typedef {Object} MinimalLibraryArchiveRecord
 * @prop {string} key
 */

// globals
// =

var datPath/** @type string - path to the dat folder */
var events = new Events()

// exported methods
// =

/**
 * @param {Object} opts
 * @param {string} opts.userDataPath
 */
export function setup (opts) {
  // make sure the folders exist
  datPath = path.join(opts.userDataPath, 'Dat')
  mkdirp.sync(path.join(datPath, 'Archives'))
}

/**
 * @returns {string}
 */
export function getDatPath () {
  return datPath
}

/**
 * @description Get the path to an archive's files.
 * @param {string | Buffer | DaemonHyperdrive} archiveOrKey
 * @returns {string}
 */
//
export function getArchiveMetaPath (archiveOrKey) {
  var key /** @type string */
  if (typeof archiveOrKey === 'string') {
    key = archiveOrKey
  } else if (Buffer.isBuffer(archiveOrKey)) {
    key = datEncoding.toStr(archiveOrKey)
  } else {
    key = datEncoding.toStr(archiveOrKey.key)
  }
  return path.join(datPath, 'Archives', 'Meta', key.slice(0, 2), key.slice(2))
}

/**
 * @description Delete all db entries and files for an archive.
 * @param {string} key
 * @returns {Promise<number>}
 */
export async function deleteArchive (key) {
  const path = getArchiveMetaPath(key)
  const info = await jetpack.inspectTreeAsync(path)
  await Promise.all([
    db.run(`DELETE FROM archives WHERE key=?`, key),
    db.run(`DELETE FROM archives_meta WHERE key=?`, key),
    jetpack.removeAsync(path)
  ])
  return info ? info.size : 0
}

export const on = events.on.bind(events)
export const addListener = events.addListener.bind(events)
export const removeListener = events.removeListener.bind(events)

/**
 * @description Upsert the last-access time.
 * @param {string | Buffer} key
 * @param {string} [timeVar]
 * @param {number} [value]
 * @returns {Promise<void>}
 */
export async function touch (key, timeVar = 'lastAccessTime', value = -1) {
  var release = await lock('archives-db:meta')
  try {
    if (timeVar !== 'lastAccessTime' && timeVar !== 'lastLibraryAccessTime') {
      timeVar = 'lastAccessTime'
    }
    if (value === -1) value = Date.now()
    var keyStr = datEncoding.toStr(key)
    await db.run(`UPDATE archives_meta SET ${timeVar}=? WHERE key=?`, [value, keyStr])
    await db.run(`INSERT OR IGNORE INTO archives_meta (key, ${timeVar}) VALUES (?, ?)`, [keyStr, value])
  } finally {
    release()
  }
}

/**
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function hasMeta (key) {
  // massage inputs
  var keyStr = typeof key !== 'string' ? datEncoding.toStr(key) : key
  if (!HYPERDRIVE_HASH_REGEX.test(keyStr)) {
    try {
      keyStr = await hyperDns.resolveName(keyStr)
    } catch (e) {
      return false
    }
  }

  // fetch
  var meta = await db.get(`
    SELECT
        archives_meta.key
      FROM archives_meta
      WHERE archives_meta.key = ?
  `, [keyStr])
  return !!meta
}

/**
 * @description
 * Get a single archive's metadata.
 * Returns an empty object on not-found.
 * @param {string | Buffer} key
 * @param {Object} [opts]
 * @param {boolean} [opts.noDefault]
 * @returns {Promise<LibraryArchiveMeta>}
 */
export async function getMeta (key, {noDefault} = {noDefault: false}) {
  // massage inputs
  var keyStr = typeof key !== 'string' ? datEncoding.toStr(key) : key
  var origKeyStr = keyStr

  // validate inputs
  if (!HYPERDRIVE_HASH_REGEX.test(keyStr)) {
    try {
      keyStr = await hyperDns.resolveName(keyStr)
    } catch (e) {
      return noDefault ? undefined : defaultMeta(keyStr, origKeyStr)
    }
  }

  // fetch
  var meta = await db.get(`
    SELECT
        archives_meta.*,
        dat_dns.name as dnsName
      FROM archives_meta
      LEFT JOIN dat_dns ON dat_dns.key = archives_meta.key AND dat_dns.isCurrent = 1
      WHERE archives_meta.key = ?
      GROUP BY archives_meta.key
  `, [keyStr])
  if (!meta) {
    return noDefault ? undefined : defaultMeta(keyStr, origKeyStr)
  }

  // massage some values
  meta.url = `hyper://${meta.dnsName || meta.key}/`
  delete meta.dnsName
  meta.writable = !!meta.isOwner
  meta.memberOf = meta.memberOf || undefined

  // remove old attrs
  delete meta.isOwner
  delete meta.createdByTitle
  delete meta.createdByUrl
  delete meta.metaSize
  delete meta.stagingSize
  delete meta.stagingSizeLessIgnored

  return meta
}

/**
 * @description Write an archive's metadata.
 * @param {string | Buffer} key
 * @param {LibraryArchiveMeta} [value]
 * @returns {Promise<void>}
 */
export async function setMeta (key, value) {
  // massage inputs
  var keyStr = datEncoding.toStr(key)

  // validate inputs
  if (!HYPERDRIVE_HASH_REGEX.test(keyStr)) {
    throw new InvalidArchiveKeyError()
  }
  if (!value || typeof value !== 'object') {
    return // dont bother
  }

  // extract the desired values
  var {title, description, type, memberOf, size, author, forkOf, mtime, writable} = value
  title = typeof title === 'string' ? title : ''
  description = typeof description === 'string' ? description : ''
  type = typeof type === 'string' ? type : ''
  memberOf = typeof memberOf === 'string' ? memberOf : ''
  var isOwnerFlag = flag(writable)
  if (typeof author === 'string') author = normalizeDriveUrl(author)
  if (typeof forkOf === 'string') forkOf = normalizeDriveUrl(forkOf)

  // write
  var release = await lock('archives-db:meta')
  var {lastAccessTime, lastLibraryAccessTime} = await getMeta(keyStr)
  try {
    await db.run(`
      INSERT OR REPLACE INTO
        archives_meta (key, title, description, type, memberOf, mtime, size, author, forkOf, isOwner, lastAccessTime, lastLibraryAccessTime)
        VALUES        (?,   ?,     ?,           ?,    ?,        ?,     ?,    ?,      ?,      ?,       ?,              ?)
    `, [keyStr, title, description, type, memberOf, mtime, size, author, forkOf, isOwnerFlag, lastAccessTime, lastLibraryAccessTime])
  } finally {
    release()
  }
  events.emit('update:archive-meta', keyStr, value)
}

export function listLegacyArchives () {
  return db.all(`SELECT archives.*, archives_meta.title from archives JOIN archives_meta ON archives_meta.key = archives.key WHERE archives.isSaved = 1`)
}

export function removeLegacyArchive (key) {
  return db.all(`UPDATE archives SET isSaved = 0 WHERE key = ?`, [key])
}

// internal methods
// =

/**
 * @param {string} key
 * @param {string} name
 * @returns {LibraryArchiveMeta}
 */
function defaultMeta (key, name) {
  return {
    key,
    url: `hyper://${name}/`,
    title: undefined,
    description: undefined,
    type: undefined,
    memberOf: undefined,
    author: undefined,
    forkOf: undefined,
    mtime: 0,
    writable: false,
    lastAccessTime: 0,
    lastLibraryAccessTime: 0,
    size: 0
  }
}

/**
 * @param {boolean} b
 * @returns {number}
 */
function flag (b) {
  return b ? 1 : 0
}

/**
 * @param {string} originURL
 * @returns {string}
 */
export function extractOrigin (originURL) {
  var urlp = url.parse(originURL)
  if (!urlp || !urlp.host || !urlp.protocol) return
  return (urlp.protocol + (urlp.slashes ? '//' : '') + urlp.host)
}

function normalizeDriveUrl (url) {
  var match = url.match(HYPERDRIVE_HASH_REGEX)
  if (match) {
    return `hyper://${match[0]}/`
  }
  return extractOrigin(url)
}