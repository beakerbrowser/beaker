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
//   - `isOwner`: bool, does beaker have the secret key?
export async function query (profileId, query) {
  query = query || {}

  // fetch archive meta
  var values = []
  var WHERE = []
  if (query.isOwner === true) WHERE.push('archives_meta.isOwner = 1')
  if (query.isOwner === false) WHERE.push('archives_meta.isOwner = 0')
  if ('isSaved' in query) {
    WHERE.push('archives.profileId = ?')
    values.push(profileId)
    if (query.isSaved) WHERE.push('archives.isSaved = 1')
    if (!query.isSaved) WHERE.push('archives.isSaved = 0')
  }
  if (WHERE.length) WHERE = `WHERE ${WHERE.join(' AND ')}`
  else WHERE = ''
  var archives = await db.all(`
    SELECT archives_meta.*, archives.isSaved, archives.autoDownload, archives.autoUpload, archives.localPath
      FROM archives_meta
      LEFT JOIN archives ON archives_meta.key = archives.key
      ${WHERE}
  `, values)

  // massage the output
  archives.forEach(archive => {
    archive.url = `dat://${archive.key}`
    archive.isOwner = archive.isOwner != 0
    archive.userSettings = {
      isSaved: archive.isSaved != 0,
      autoDownload: archive.autoDownload != 0,
      autoUpload: archive.autoUpload != 0,
      localPath: archive.localPath
    }

    delete archive.isSaved
    delete archive.autoDownload
    delete archive.autoUpload
    delete archive.localPath
  })
  return archives
}

// get all archives that are ready for garbage collection
export async function listExpiredArchives ({olderThan, biggerThan} = {}) {
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

    if (typeof value.key === 'undefined') {
      // create
      value = {
        profileId,
        key,
        isSaved: newValues.isSaved,
        autoDownload: ('autoDownload' in newValues) ? newValues.autoDownload : newValues.isSaved,
        autoUpload: ('autoUpload' in newValues) ? newValues.autoUpload : newValues.isSaved,
        localPath: newValues.localPath
      }
      await db.run(`
        INSERT INTO archives (profileId, key, isSaved, autoDownload, autoUpload, localPath) VALUES (?, ?, ?, ?, ?, ?)
      `, [profileId, key, flag(value.isSaved), flag(value.autoDownload), flag(value.autoUpload), value.localPath])
    } else {
      // update
      var { isSaved, autoDownload, autoUpload, localPath } = newValues
      if (typeof isSaved === 'boolean') value.isSaved = isSaved
      if (typeof autoDownload === 'boolean') value.autoDownload = autoDownload
      if (typeof autoUpload === 'boolean') value.autoUpload = autoUpload
      if (typeof localPath === 'string') value.localPath = localPath
      await db.run(`
        UPDATE archives SET isSaved = ?, autoDownload = ?, autoUpload = ?, localPath = ? WHERE profileId = ? AND key = ?
      `, [flag(value.isSaved), flag(value.autoDownload), flag(value.autoUpload), value.localPath, profileId, key])
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

  try {
    // fetch
    var meta = await db.get(`
      SELECT * FROM archives_meta WHERE key = ?
    `, [key])

    // massage some values
    meta.isOwner = !!meta.isOwner
    return meta
  } catch (e) {
    return {}
  }
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
  var {title, description, mtime, metaSize, stagingSize, stagingSizeLessIgnored, isOwner} = value
  isOwner = isOwner ? 1 : 0

  // write
  await db.run(`
    INSERT OR REPLACE INTO
      archives_meta (key, title, description, mtime, metaSize, stagingSize, stagingSizeLessIgnored, isOwner)
      VALUES        (?,   ?,     ?,           ?,     ?,        ?,           ?,                      ?)
  `, [key, title, description, mtime, metaSize, stagingSize, stagingSizeLessIgnored, isOwner])
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
