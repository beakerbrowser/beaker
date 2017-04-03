import {app} from 'electron'
import path from 'path'
import url from 'url'
import level from 'level'
import subleveldown from 'subleveldown'
import mkdirp from 'mkdirp'
import Events from 'events'
import datEncoding from 'dat-encoding'
import {InvalidArchiveKeyError} from 'beaker-error-constants'
import {cbPromise} from '../../lib/functions'
import {setupLevelDB} from '../../lib/bg/db'
import lock from '../../lib/lock'
import {DAT_HASH_REGEX} from '../../lib/const'
import * as profileDataDb from './profile-data-db'

// globals
// =

var dbPath // path to the hyperdrive folder
var db // level instance
var events = new Events()
var archiveMetaDb // archive metadata sublevel
var migrations
var setupPromise

// exported methods
// =

export function setup () {
  // open database
  dbPath = path.join(app.getPath('userData'), 'Hyperdrive')
  mkdirp.sync(path.join(dbPath, 'Archives')) // make sure the folders exist
  db = level(dbPath)
  archiveMetaDb = subleveldown(db, 'archive-meta', { valueEncoding: 'json' })
  setupPromise = setupLevelDB(db, migrations, '[DAT ARCHIVES]')
}

// get the leveldb instance
export function getLevelInstance () {
  return db
}

// get the path to an archive's files
export function getArchiveFilesPath (archiveOrKey) {
  return path.join(dbPath, 'Archives', datEncoding.toStr(archiveOrKey.key || archiveOrKey))
}

export const on = events.on.bind(events)
export const addListener = events.addListener.bind(events)
export const removeListener = events.removeListener.bind(events)

// exported methods: archive user settings
// =

// get an array of saved archives
// - optional `query` keys:
//   - `isSaved`: bool
//   - `isOwner`: bool, does beaker have the secret key? requires opts.includeMeta
// - optional `opt` keys:
//   - `includeMeta`: bool, include the archive meta in the response?
export async function queryArchiveUserSettings (profileId, query, opts) {
  query = query || {}
  opts = opts || {}
  await setupPromise

  // fetch archive meta
  var extra = ''
  if (query.isSaved === true) extra = 'AND isSaved = 1'
  if (query.isSaved === false) extra = 'AND isSaved = 0'
  var archives = await profileDataDb.all(`
    SELECT * FROM archives WHERE profileId = ? ${extra}
  `, [profileId])

  var values = []
  await Promise.all(archives.map(async (entry) => {
    var value = {
      key: entry.key,
      url: `dat://${entry.key}`,
      isSaved: !!entry.isSaved
    }

    // done?
    if (!opts.includeMeta && !('isOwner' in query)) {
      values.push(value)
      return
    }

    // get meta
    var meta = await getArchiveMeta(value.key)

    // run extra query
    if (query.isOwner === false && meta.isOwner === true) return
    if (query.isOwner === true && meta.isOwner === false) return

    // done
    meta.userSettings = {isSaved: value.isSaved}
    values.push(meta)
  }))
  return values
}

// get a single archive's user settings
// - supresses a not-found with an empty object
export async function getArchiveUserSettings (profileId, key) {
  // massage inputs
  key = datEncoding.toStr(key)

  // validate inputs
  if (!DAT_HASH_REGEX.test(key)) {
    throw new InvalidArchiveKeyError()
  }

  // fetch
  try {
    var settings = await profileDataDb.get(`
      SELECT * FROM archives WHERE profileId = ? AND key = ?
    `, [profileId, key])
    settings.isSaved = !!settings.isSaved
    return settings
  } catch (e) {
    return {}
  }
}

// write an archive's user setting
export async function setArchiveUserSettings (profileId, key, newValues = {}) {
  // massage inputs
  key = datEncoding.toStr(key)

  // validate inputs
  if (!DAT_HASH_REGEX.test(key)) {
    throw new InvalidArchiveKeyError()
  }

  var release = await lock('archives-db')
  try {
    // fetch current
    var value = await profileDataDb.get(`
      SELECT * FROM archives WHERE profileId = ? AND key = ?
    `, [profileId, key])

    if (!value) {
      // create
      value = {
        profileId,
        key,
        isSaved: newValues.isSaved
      }
      await profileDataDb.run(`
        INSERT INTO archives (profileId, key, isSaved) VALUES (?, ?, ?)
      `, [profileId, key, value.isSaved ? 1 : 0])
    } else {
      // update
      var { isSaved } = newValues
      if (typeof isSaved === 'boolean') value.isSaved = isSaved
      await profileDataDb.run(`
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
// - supresses a not-found with a default response, with notFound == true
export async function getArchiveMeta (key) {
  // massage inputs
  key = datEncoding.toStr(key)

  // validate inputs
  if (!DAT_HASH_REGEX.test(key)) {
    throw new InvalidArchiveKeyError()
  }

  // fetch
  await setupPromise
  return new Promise(resolve => {
    archiveMetaDb.get(key, (_, meta) => resolve(archiveMetaObject(key, meta)))
  })
}

// write an archive's metadata
export async function setArchiveMeta (key, value = {}) {
  // massage inputs
  key = datEncoding.toStr(key)

  // validate inputs
  if (!DAT_HASH_REGEX.test(key)) {
    throw new InvalidArchiveKeyError()
  }

  // extract the desired values
  var { title, description, author, forkOf, createdBy, mtime, size, isOwner } = value
  value = { title, description, author, forkOf, createdBy, mtime, size, isOwner }

  // write
  await setupPromise
  return cbPromise(cb => {
    archiveMetaDb.put(key, value, err => {
      if (err) return cb(err)
      events.emit('update:archive-meta', key, value)
      cb()
    })
  })
}

// internal methods
// =

// helper to make sure archive-meta reads are well-formed
function archiveMetaObject (key, obj) {
  obj = obj || { notFound: true }
  return Object.assign({
    key,
    url: 'dat://' + key,
    title: '',
    description: '',
    author: '',
    createdBy: null,
    forkOf: [],
    mtime: 0,
    size: 0,
    isOwner: false
  }, obj)
}


export function extractOrigin (originURL) {
  var urlp = url.parse(originURL)
  if (!urlp || !urlp.host || !urlp.protocol) return
  return (urlp.protocol + (urlp.slashes ? '//' : '') + urlp.host)
}

migrations = [
  // version 1
  function (cb) {
    // noop
    db.put('version', 1, cb)
  }
]
