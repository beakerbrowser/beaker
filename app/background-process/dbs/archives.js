import {app} from 'electron'
import path from 'path'
import url from 'url'
import mkdirp from 'mkdirp'
import Events from 'events'
import datEncoding from 'dat-encoding'
import {InvalidArchiveKeyError} from 'beaker-error-constants'
import * as db from './profile-data-db' // TODO rename to db
import lock from '../../lib/lock'
import {DAT_HASH_REGEX} from '../../lib/const'

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

  // DEBUG (delete me!)
  db.run(`
CREATE TABLE archives_meta (
  key TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  forkOf TEXT,
  createdByUrl TEXT,
  createdByTitle TEXT,
  mtime INTEGER,
  size INTEGER,
  isOwner INTEGER
);`)
}

// get the path to an archive's files
export function getArchiveFilesPath (archiveOrKey) {
  return path.join(datPath, 'Archives', datEncoding.toStr(archiveOrKey.key || archiveOrKey))
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
  var WHERE = ''
  var JOIN
  if (query.isOwner === true) WHERE = ' AND archives_meta.isOwner = 1'
  if (query.isOwner === false) WHERE = ' AND archives_meta.isOwner = 0'
  if ('isSaved' in query) {
    JOIN = 'INNER JOIN archives ON archives_meta.key = archives.key'
    if (query.isSaved === true) WHERE += ' AND archives.isSaved = 1'
    if (query.isSaved === false) WHERE += ' AND archives.isSaved = 0'
  }
  var archives = await db.all(`
    SELECT * FROM archives_meta ${JOIN} WHERE profileId = ? ${WHERE}
  `, [profileId])

  // add some attrs
  archives.forEach(archive => {
    archive.url = `dat://${archive.key}`
    archive.isOwner = archive.isOwner != 0
    archive.isSaved = archive.isSaved != 0
    archive.createdBy = {
      title: archive.createdByTitle,
      url: archive.createdByUrl
    }
    delete archive.createdByTitle
    delete archive.createdByUrl
  })
  return archives
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
    var value = await db.get(`
      SELECT * FROM archives WHERE profileId = ? AND key = ?
    `, [profileId, key])

    if (!value) {
      // create
      value = {
        profileId,
        key,
        isSaved: newValues.isSaved
      }
      await db.run(`
        INSERT INTO archives (profileId, key, isSaved) VALUES (?, ?, ?)
      `, [profileId, key, value.isSaved ? 1 : 0])
    } else {
      // update
      var { isSaved } = newValues
      if (typeof isSaved === 'boolean') value.isSaved = isSaved
      await db.run(`
        UPDATE archives SET isSaved = ? WHERE profileId = ? AND key = ?
      `, [value.isSaved ? 1 : 0, profileId, key])
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
    try { meta.forkOf = JSON.parse(meta.forkOf) } catch (e) {}
    meta.createdBy = {url: meta.createdByUrl, title: meta.createdByTitle}
    delete meta.createdByUrl; delete meta.createdByTitle
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
  var {title, description, forkOf, createdBy, mtime, size, isOwner} = value
  isOwner = isOwner ? 1 : 0
  forkOf = Array.isArray(forkOf) ? JSON.stringify(forkOf) : forkOf
  var createdByUrl = createdBy && createdBy.url ? createdBy.url : ''
  var createdByTitle = createdBy && createdBy.title ? createdBy.title : ''

  // write
  await db.run(`
    INSERT OR REPLACE INTO 
      archives_meta (key, title, description, forkOf, createdByUrl, createdByTitle, mtime, size, isOwner)
      VALUES        (?,   ?,     ?,           ?,      ?,            ?,              ?,     ?,    ?)
  `,                [key, title, description, forkOf, createdByUrl, createdByTitle, mtime, size, isOwner])
  events.emit('update:archive-meta', key, value)
}

// internal methods
// =

export function extractOrigin (originURL) {
  var urlp = url.parse(originURL)
  if (!urlp || !urlp.host || !urlp.protocol) return
  return (urlp.protocol + (urlp.slashes ? '//' : '') + urlp.host)
}