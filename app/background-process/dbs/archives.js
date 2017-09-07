import {app} from 'electron'
import path from 'path'
import url from 'url'
import mkdirp from 'mkdirp'
import Events from 'events'
import datEncoding from 'dat-encoding'
import jetpack from 'fs-jetpack'
import {InvalidArchiveKeyError} from 'beaker-error-constants'
import * as db from './profile-data-db' // TODO rename to db
import lock from '../../lib/lock'
import {
  DAT_HASH_REGEX,
  DAT_GC_EXPIRATION_AGE,
  DAT_GC_DEFAULT_MINIMUM_SIZE
} from '../../lib/const'

// globals
// =

var datPath // path to the dat folder
var events = new Events()

// exported methods
// =

export function setup () {
  // make sure the folders exist
  datPath = path.join(app.getPath('userData'), 'Dat')
  mkdirp.sync(path.join(datPath, 'Archives'))
}

// get the path to an archive's files
export function getArchiveMetaPath (archiveOrKey) {
  var key = datEncoding.toStr(archiveOrKey.key || archiveOrKey)
  return path.join(datPath, 'Archives', 'Meta', key.slice(0, 2), key.slice(2))
}

// delete all db entries and files for an archive
export async function deleteArchive (key) {
  await Promise.all([
    db.run(`DELETE FROM archives WHERE key=?`, key),
    db.run(`DELETE FROM archives_meta WHERE key=?`, key),
    db.run(`DELETE FROM archives_meta_type WHERE key=?`, key),
    jetpack.removeAsync(getArchiveMetaPath(key))
  ])
}

export const on = events.on.bind(events)
export const addListener = events.addListener.bind(events)
export const removeListener = events.removeListener.bind(events)

// exported methods: archive user settings
// =

// get an array of saved archives
// - optional `query` keys:
//   - `isSaved`: bool
//   - `isNetworked`: bool
//   - `isOwner`: bool, does beaker have the secret key?
export async function query (profileId, query) {
  query = query || {}

  // fetch archive meta
  var values = []
  var WHERE = []
  if (query.isOwner === true) WHERE.push('archives_meta.isOwner = 1')
  if (query.isOwner === false) WHERE.push('archives_meta.isOwner = 0')
  if (query.isNetworked === true) WHERE.push('archives.networked = 1')
  if (query.isNetworked === false) WHERE.push('archives.networked = 0')
  if ('isSaved' in query) {
    WHERE.push('archives.profileId = ?')
    values.push(profileId)
    if (query.isSaved) WHERE.push('archives.isSaved = 1')
    if (!query.isSaved) WHERE.push('archives.isSaved = 0')
  }
  if ('type' in query) {
    WHERE.push('archives_meta_type.type = ?')
    values.push(query.type)
  }
  if (WHERE.length) WHERE = `WHERE ${WHERE.join(' AND ')}`
  else WHERE = ''

  var archives = await db.all(`
    SELECT
        archives_meta.*,
        GROUP_CONCAT(archives_meta_type.type) AS type,
        archives.isSaved,
        archives.networked,
        archives.autoDownload,
        archives.autoUpload
      FROM archives_meta
      LEFT JOIN archives ON archives.key = archives_meta.key
      LEFT JOIN archives_meta_type ON archives_meta_type.key = archives_meta.key
      ${WHERE}
      GROUP BY archives_meta.key
  `, values)

  // massage the output
  archives.forEach(archive => {
    archive.url = `dat://${archive.key}`
    archive.isOwner = archive.isOwner != 0
    archive.type = archive.type ? archive.type.split(',') : []
    archive.userSettings = {
      isSaved: archive.isSaved != 0,
      networked: archive.networked != 0,
      autoDownload: archive.autoDownload != 0,
      autoUpload: archive.autoUpload != 0
    }

    delete archive.isSaved
    delete archive.networked
    delete archive.autoDownload
    delete archive.autoUpload
  })
  return archives
}

// get all archives that should be unsaved
export async function listExpiredArchives () {
  var now = Date.now()
  return db.all(`
    SELECT archives.key
      FROM archives
      WHERE
        archives.isSaved = 1
        AND archives.expiresAt != 0
        AND archives.expiresAt IS NOT NULL
        AND archives.expiresAt < ?
  `, [Date.now()])
}

// get all archives that are ready for garbage collection
export async function listGarbageCollectableArchives ({olderThan, biggerThan} = {}) {
  olderThan = olderThan || DAT_GC_EXPIRATION_AGE
  biggerThan = biggerThan || DAT_GC_DEFAULT_MINIMUM_SIZE
  return db.all(`
    SELECT archives_meta.key
      FROM archives_meta
      LEFT JOIN archives ON archives_meta.key = archives.key
      WHERE
        (archives.isSaved != 1 OR archives.isSaved IS NULL)
        AND archives_meta.lastAccessTime < ?
        AND archives_meta.metaSize > ?
  `, [Date.now() - olderThan, biggerThan])
}

// upsert the last-access time
export async function touch (key) {
  var now = Date.now()
  key = datEncoding.toStr(key)
  await db.run(`UPDATE archives_meta SET lastAccessTime=? WHERE key=?`, [now, key])
  await db.run(`INSERT OR IGNORE INTO archives_meta (key, lastAccessTime) VALUES (?, ?)`, [key, now])
}

// get a single archive's user settings
// - supresses a not-found with an empty object
export async function getUserSettings (profileId, key) {
  // massage inputs
  key = datEncoding.toStr(key)

  // validate inputs
  if (!DAT_HASH_REGEX.test(key)) {
    throw new InvalidArchiveKeyError()
  }

  // fetch
  try {
    var settings = await db.get(`
      SELECT * FROM archives WHERE profileId = ? AND key = ?
    `, [profileId, key])
    settings.isSaved = !!settings.isSaved
    settings.networked = !!settings.networked
    settings.autoDownload = !!settings.autoDownload
    settings.autoUpload = !!settings.autoUpload
    return settings
  } catch (e) {
    return {}
  }
}

// write an archive's user setting
export async function setUserSettings (profileId, key, newValues = {}) {
  // massage inputs
  key = datEncoding.toStr(key)

  // validate inputs
  if (!DAT_HASH_REGEX.test(key)) {
    throw new InvalidArchiveKeyError()
  }

  var release = await lock('archives-db')
  try {
    // fetch current
    var value = await getUserSettings(profileId, key)

    if (!value || typeof value.key === 'undefined') {
      // create
      value = {
        profileId,
        key,
        isSaved: newValues.isSaved,
        networked: ('networked' in newValues) ? newValues.networked : true,
        autoDownload: ('autoDownload' in newValues) ? newValues.autoDownload : newValues.isSaved,
        autoUpload: ('autoUpload' in newValues) ? newValues.autoUpload : newValues.isSaved,
        expiresAt: newValues.expiresAt
      }
      await db.run(`
        INSERT INTO archives (profileId, key, isSaved, networked, autoDownload, autoUpload, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [profileId, key, flag(value.isSaved), flag(value.networked), flag(value.autoDownload), flag(value.autoUpload), value.expiresAt])
    } else {
      // update
      var { isSaved, networked, autoDownload, autoUpload, expiresAt } = newValues
      if (typeof isSaved === 'boolean') value.isSaved = isSaved
      if (typeof networked === 'boolean') value.networked = networked
      if (typeof autoDownload === 'boolean') value.autoDownload = autoDownload
      if (typeof autoUpload === 'boolean') value.autoUpload = autoUpload
      if (typeof expiresAt === 'number') value.expiresAt = expiresAt
      await db.run(`
        UPDATE archives SET isSaved = ?, networked = ?, autoDownload = ?, autoUpload = ?, expiresAt = ? WHERE profileId = ? AND key = ?
      `, [flag(value.isSaved), flag(value.networked), flag(value.autoDownload), flag(value.autoUpload), value.expiresAt, profileId, key])
    }

    events.emit('update:archive-user-settings', key, value)
    return value
  } finally {
    release()
  }
}

// exported methods: archive meta
// =

// get a single archive's metadata
// - supresses a not-found with an empty object
export async function getMeta (key) {
  // massage inputs
  key = datEncoding.toStr(key)

  // validate inputs
  if (!DAT_HASH_REGEX.test(key)) {
    throw new InvalidArchiveKeyError()
  }

  // fetch
  var meta = await db.get(`
    SELECT
        archives_meta.*,
        GROUP_CONCAT(archives_meta_type.type) AS type
      FROM archives_meta
      LEFT JOIN archives_meta_type ON archives_meta_type.key = archives_meta.key      
      WHERE archives_meta.key = ?
      GROUP BY archives_meta.key
  `, [key])
  if (!meta) return {}

  // massage some values
  meta.isOwner = !!meta.isOwner
  meta.type = meta.type ? meta.type.split(',') : []
  return meta
}

// write an archive's metadata
export async function setMeta (key, value = {}) {
  // massage inputs
  key = datEncoding.toStr(key)

  // validate inputs
  if (!DAT_HASH_REGEX.test(key)) {
    throw new InvalidArchiveKeyError()
  }

  // extract the desired values
  var {title, description, type, mtime, isOwner} = value
  title = typeof title === 'string' ? title : ''
  description = typeof description === 'string' ? description : ''
  if (typeof type === 'string') type = type.split(' ')
  else if (Array.isArray(type)) type = type.filter(v => v && typeof v === 'string')
  isOwner = flag(isOwner)

  // write
  var release = await lock('archives-db:setMeta')
  try {
    await db.run(`
      INSERT OR REPLACE INTO
        archives_meta (key, title, description, mtime, isOwner)
        VALUES        (?,   ?,     ?,           ?,     ?)
    `, [key, title, description, mtime, isOwner])
    db.run(`DELETE FROM archives_meta_type WHERE key=?`, key)
    if (type) {
      await Promise.all(type.map(t => (
        db.run(`INSERT INTO archives_meta_type (key, type) VALUES (?, ?)`, [key, t])
      )))
    }
  } finally {
    release()
  }
  events.emit('update:archive-meta', key, value)
}

// internal methods
// =

function flag (b) {
  return b ? 1 : 0
}

export function extractOrigin (originURL) {
  var urlp = url.parse(originURL)
  if (!urlp || !urlp.host || !urlp.protocol) return
  return (urlp.protocol + (urlp.slashes ? '//' : '') + urlp.host)
}
