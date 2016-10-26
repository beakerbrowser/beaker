import { app } from 'electron'
import path from 'path'
import level from 'level'
import subleveldown from 'subleveldown'
import mkdirp from 'mkdirp'
import { Transform } from 'stream'
import concat from 'concat-stream'
import pump from 'pump'
import { cbPromise } from '../../lib/functions'

//
// TODO complete the API for the dbs
// TODO locks
// TODO migrations
//


// globals
// =

var dbPath // path to the hyperdrive folder
var db // level instance
var archiveMetaDb // archive metadata sublevel
var archiveUserSettingsDb // archive user-settings sublevel
var globalSettingsDb // global settings sublevel

// exported methods
// =

export function setup () {
  // open database
  dbPath = path.join(app.getPath('userData'), 'Hyperdrive')
  mkdirp.sync(path.join(dbPath, 'Archives')) // make sure the folders exist
  db = level(dbPath)
  archiveMetaDb = subleveldown(db, 'archive-meta', { valueEncoding: 'json' })
  archiveUserSettingsDb = subleveldown(db, 'archive-user-settings', { valueEncoding: 'json' })
  globalSettingsDb = subleveldown(db, 'global-settings', { valueEncoding: 'json' })
}

// get the leveldb instance
export function getLevelInstance () {
  return db
}

// get the path to an archive's files
export function getArchiveFilesPath (archiveOrKey) {
  return path.join(dbPath, 'Archives', bufToStr(archiveOrKey.key || archiveOrKey))
}

// get an array of saved archives
// - includes archive
// - optional `query` keys:
//   - `isSaved`, `isUploading`, `isDownloading`: bool, is claimed by any site?
//   - `isSavedBy`, `isUploadingBy`, `isDownloadingBy`: bool: string, is claimed by the given site? eg { isSavedBy: 'http://foo.com' }
//   - `isOwner`: bool, does beaker have the secret key? requires opts.includeMeta
// - optional `opt` keys:
//   - `includeMeta`: bool, include the archive meta in the response?
export function queryArchiveUserSettings (query, opts) {
  query = query || {}
  opts = opts || {}
  return new Promise((resolve, reject) => {
    // read the stream
    pump(
      archiveUserSettingsDb.createReadStream(),
      new SavedArchivesTransform(query, opts),
      concat({ encoding: 'objects' }, objs => resolve(objs)),
      err => { if (err) { reject(err) } }
    )
  })
}

// get a single archive's user settings
// - supresses a not-found with a default response, with notFound == true
export function getArchiveUserSettings (key) {
  return new Promise((resolve, reject) => {
    archiveMetaDb.get(key, (_, meta) => resolve(archiveUserSettingsDefaults(meta || { notFound: true })))
  })
}

// get a single archive's metadata
// - supresses a not-found with a default response, with notFound == true
export function getArchiveMeta (key) {
  return new Promise((resolve, reject) => {
    archiveMetaDb.get(key, (_, meta) => resolve(archiveMetaDefaults(meta || { notFound: true })))
  })
}

// read a global setting
export function getGlobalSetting (key) {
  return cbPromise(cb => globalSettingsDb.get(key, cb))
}

// write a global setting
export function setGlobalSetting (key, value) {
  return cbPromise(cb => globalSettingsDb.put(key, value, cb))
}

// TODO rewrite this method
export function setArchiveUserSettings (key, value) {
  return new Promise((resolve, reject) => {
    // db result handler
    var cb = err => {
      if (err) reject(err)
      else resolve()
    }

    // massage data
    var config = {
      isSaved: !!value.isSaved,
      isServing: !!value.isServing
    }

    // add/update
    archiveUserSettingsDb.put(key, config, cb)

    // update the swarm/download behaviors
    var archive = getArchive(key)
    swarm(key).upload = config.isServing || (config.isSaved && !archive.owner) // upload if the user wants to serve, or has saved and isnt the owner
    if (config.isServing) {
      archive.content.prioritize({start: 0, end: Infinity}) // download content automatically
    } else {
      archive.content.unprioritize({start: 0, end: Infinity}) // download content on demand
    }
  })
}

// internal methods
// =

function archiveMetaDefaults (obj) {
  return Object.assign({
    title: '',
    description: '',
    author: '',
    mtime: 0,
    size: 0,
    isOwner: false
  }, obj)
}

function archiveUserSettingsDefaults (obj) {
  return Object.assign({
    saveClaims: [],
    downloadClaims: [],
    uploadClaims: []
  }, obj)
}

// convert to string, if currently a buffer
function bufToStr (v) {
  if (Buffer.isBuffer(v)) return v.toString('hex')
  return v
}

class SavedArchivesTransform extends Transform {
  constructor (query, opts) {
    super()
    this.query = query
    this.opts = opts
  }
  _transform (entry, encoding, callback) {
    var { key, value } = entry
    const query = this.query
    const opts = this.opts
    value = archiveUserSettingsDefaults(value)

    // run query
    if (failsClaim(query.isSaved, value.saveClaims)) return
    if (failsClaim(query.isUploading, value.uploadClaims)) return
    if (failsClaim(query.isDownloading, value.downloadClaims)) return
    if (failsClaimBy(query.isSavedBy, value.saveClaims)) return
    if (failsClaimBy(query.isUploadingBy, value.uploadClaims)) return
    if (failsClaimBy(query.isDownloadingBy, value.downloadClaims)) return

    // done?
    if (!opts.includeMeta) {
      value.key = key
      return callback(null, value)
    }

    // get meta
    getArchiveMeta(key, (err, meta) => {
      if (err) return callback(err)

      // run extra query
      if (query.isOwner === false && meta.isOwner === true) return
      if (query.isOwner === true && meta.isOwner === false) return

      // done
      value.key = key
      value.meta = meta
      callback(null, value)
    })
  }
}

// filter helpers
function failsClaim (query, value) {
  if (query === false && isTruthyArray(value) === true) return true
  if (query === true && isTruthyArray(value) === false) return true
  return false
}
function failsClaimBy (query, value) {
  if (query && !arrayIncludes(value, query)) return true
  return false
}
function isTruthyArray (v) {
  return Array.isArray(v) && v.length > 0
}
function arrayIncludes (v, e) {
  return isTruthyArray(v) && v.includes(e)
}
