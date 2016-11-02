import { app } from 'electron'
import path from 'path'
import url from 'url'
import level from 'level'
import subleveldown from 'subleveldown'
import mkdirp from 'mkdirp'
import { Transform } from 'stream'
import concat from 'concat-stream'
import pump from 'pump'
import Events from 'events'
import { cbPromise } from '../../lib/functions'
import { setupLevelDB, makeTxLock } from '../../lib/bg/db'
import { transform, noopWritable } from '../../lib/streams'
import { bufToStr } from '../networks/dat/helpers'
import { DAT_HASH_REGEX, InvalidOperationError, InvalidArchiveKeyError } from '../../lib/const'
import { getOrLoadArchive } from '../networks/dat/dat'

// globals
// =

var dbPath // path to the hyperdrive folder
var db // level instance
var events = new Events()
var archiveMetaDb // archive metadata sublevel
var archiveUserSettingsDb // archive user-settings sublevel
var globalSettingsDb // global settings sublevel
var migrations
var setupPromise
var archiveUserSettingsTxLock = makeTxLock()

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
  setupPromise = setupLevelDB(db, migrations, '[DAT ARCHIVES]')
}

// get the leveldb instance
export function getLevelInstance () {
  return db
}

// get the path to an archive's files
export function getArchiveFilesPath (archiveOrKey) {
  return path.join(dbPath, 'Archives', bufToStr(archiveOrKey.key || archiveOrKey))
}

export const on = events.on.bind(events)
export const addListener = events.addListener.bind(events)
export const removeListener = events.removeListener.bind(events)

// exported methods: archive user settings
// =

// get an array of saved archives
// - includes archive
// - optional `query` keys:
//   - `isSaved`, `isUploading`, `isDownloading`: bool, is X behavior claimed by any site?
//   - `isNetworked`: bool, is upload or download claim by any site?
//   - `isSavedBy`, `isUploadingBy`, `isDownloadingBy`: bool: string, is X behavior claimed by the given site? eg { isSavedBy: 'http://foo.com' }
//   - `isOwner`: bool, does beaker have the secret key? requires opts.includeMeta
// - optional `opt` keys:
//   - `includeMeta`: bool, include the archive meta in the response?
export function queryArchiveUserSettings (query, opts) {
  query = query || {}
  opts = opts || {}
  return setupPromise.then(() => new Promise((resolve, reject) => {
    // read the stream
    pump(
      archiveUserSettingsDb.createReadStream(),
      new QueryArchiveUserSettingsTransform(query, opts),
      concat({ encoding: 'objects' }, objs => resolve(objs)),
      err => { if (err) { reject(err) } }
    )
  }))
}

class QueryArchiveUserSettingsTransform extends Transform {
  constructor (query, opts) {
    super({ objectMode: true })
    this.query = query
    this.opts = opts
  }
  _transform (entry, encoding, cb) {
    var { key, value } = entry
    const query = this.query
    const opts = this.opts
    value = archiveUserSettingsObject(key, value)

    // run query
    if (failsClaim(query.isSaved, value.saveClaims)) return cb()
    if (failsClaim(query.isUploading, value.uploadClaims)) return cb()
    if (failsClaim(query.isDownloading, value.downloadClaims)) return cb()
    if (query.isNetworked === true && !isTruthyArray(value.uploadClaims) && !isTruthyArray(value.downloadClaims)) return cb()
    if (failsClaimBy(query.isSavedBy, value.saveClaims)) return cb()
    if (failsClaimBy(query.isUploadingBy, value.uploadClaims)) return cb()
    if (failsClaimBy(query.isDownloadingBy, value.downloadClaims)) return cb()

    // done?
    if (!opts.includeMeta) {
      return cb(null, value)
    }

    // get meta
    getArchiveMeta(key).then(
      meta => {
        // run extra query
        if (query.isOwner === false && meta.isOwner === true) return cb()
        if (query.isOwner === true && meta.isOwner === false) return cb()

        // done
        meta.userSettings = value
        cb(null, meta)
      },
      err => cb(err)
    )
  }
}

// get a single archive's user settings
// - supresses a not-found with a default response, with notFound == true
export function getArchiveUserSettings (key) {
  // massage inputs
  key = bufToStr(key)

  // validate inputs
  if (!DAT_HASH_REGEX.test(key)) return Promise.reject(new InvalidArchiveKeyError())

  // fetch
  return setupPromise.then(() => new Promise((resolve, reject) => {
    archiveUserSettingsDb.get(key, (_, meta) => resolve(archiveUserSettingsObject(key, meta)))
  }))
}

// write an archive's user setting
export function setArchiveUserSettings (key, value = {}) {
  // massage inputs
  key = bufToStr(key)

  // validate inputs
  if (!DAT_HASH_REGEX.test(key)) return Promise.reject(new InvalidArchiveKeyError())

  return setupPromise.then(() => cbPromise(cb => {
    archiveUserSettingsTxLock(endTx => {
      // extract the desired values
      var { saveClaims, downloadClaims, uploadClaims } = value
      value = { saveClaims, downloadClaims, uploadClaims }

      // write
      archiveUserSettingsDb.put(key, value, err => {
        endTx()
        if (err) return cb(err)
        events.emit('update:archive-user-settings', key, value)
        cb(null, value)
      })
    })
  }))
}

// add/remove a claim to the archive
// - `key` string, the archive key
// - `origin` string, the origin making the claim
// - `op` string, should be "add", "remove", "remove-all", or "toggle-all"
//    - the *-all ops overwrite the current claims. Should only be used by internal views.
// - `claims` string or array of strings, should be "save", "upload", or "download"
export function updateArchiveClaims (key, { origin, op, claims }) {
  // massage inputs
  key = bufToStr(key)
  claims = Array.isArray(claims) ? claims : [claims]
  origin = extractOrigin(origin)

  // validate inputs
  if (!DAT_HASH_REGEX.test(key)) return Promise.reject(new InvalidArchiveKeyError())
  if (!origin) return Promise.reject(new InvalidURLError())
  if (['add', 'remove', 'remove-all', 'toggle-all'].includes(op) === false) return Promise.reject(new InvalidOperationError())

  return setupPromise.then(() => cbPromise(cb => {
    // start lock
    archiveUserSettingsTxLock(endTx => {
      // fetch settings
      archiveUserSettingsDb.get(key, (_, value) => {
        value = archiveUserSettingsObject(key, value)

        // update the claims
        claims.forEach(claimKey => {
          var claim = value[claimKey + 'Claims']
          if (!claim) return

          if (op === 'add') {
            if (!claim.includes(origin)) claim.push(origin)
          } else if (op === 'remove') {
            let index = claim.indexOf(origin)
            if (index !== -1) claim.splice(index, 1)
          } else if (op === 'remove-all') {
            value[claimKey + 'Claims'] = []
          } else if (op === 'toggle-all') {
            if (claim.length > 0) value[claimKey + 'Claims'] = []
            else value[claimKey + 'Claims'] = [origin]
          }
        })

        // extract the desired values
        var { saveClaims, downloadClaims, uploadClaims } = value
        value = { saveClaims, downloadClaims, uploadClaims }

        // write
        archiveUserSettingsDb.put(key, value, err => {
          endTx()
          if (err) return cb(err)
          events.emit('update:archive-user-settings', key, value)
          cb(null, value)
        })
      })
    })
  }))
}

// exported methods: archive meta
// =

// get a single archive's metadata
// - supresses a not-found with a default response, with notFound == true
export function getArchiveMeta (key) {
  // massage inputs
  key = bufToStr(key)

  // validate inputs
  if (!DAT_HASH_REGEX.test(key)) return Promise.reject(new InvalidArchiveKeyError())

  // fetch
  return setupPromise.then(() => new Promise((resolve, reject) => {
    archiveMetaDb.get(key, (_, meta) => resolve(archiveMetaObject(key, meta)))
  }))
}

// write an archive's metadata
export function setArchiveMeta (key, value = {}) {
  // massage inputs
  key = bufToStr(key)

  // validate inputs
  if (!DAT_HASH_REGEX.test(key)) return Promise.reject(new InvalidArchiveKeyError())

  return setupPromise.then(() => cbPromise(cb => {
    // extract the desired values
    var { title, description, author, mtime, size, isOwner } = value
    value = { title, description, author, mtime, size, isOwner }

    // write
    archiveMetaDb.put(key, value, err => {
      if (err) return cb(err)
      events.emit('update:archive-meta', key, value)
      cb()
    })
  }))
}

// exported methods: global settings
// =

// read a global setting
export function getGlobalSetting (key) {
  return setupPromise.then(() => cbPromise(cb => globalSettingsDb.get(key, cb)))
}

// write a global setting
export function setGlobalSetting (key, value = {}) {
  return setupPromise.then(() => cbPromise(cb => {
    globalSettingsDb.put(key, value, err => {
      if (err) return cb(err)
      events.emit('update:global-setting', key, value)
      events.emit('update:global-setting:' + key, value)
      cb()
    })
  }))
}

// internal methods
// =

// helper to make sure archive-meta reads are well-formed
function archiveMetaObject (key, obj) {
  obj = obj || { notFound: true }
  return Object.assign({
    key,
    title: '',
    description: '',
    author: '',
    mtime: 0,
    size: 0,
    isOwner: false
  }, obj)
}

// helper to make sure archive-user-settings reads are well-formed
function archiveUserSettingsObject (key, obj) {
  obj = obj || { notFound: true }
  return Object.assign({
    key,
    saveClaims: [],
    downloadClaims: [],
    uploadClaims: []
  }, obj)
}

function extractOrigin (originURL) {
  var urlp = url.parse(originURL)
  if (!urlp || !urlp.host || !urlp.protocol) return
  return (urlp.protocol + (urlp.slashes ? '//' : '') + urlp.host)
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

migrations = [
  // version 1
  function (cb) {
    // noop
    db.put('version', 1, cb)
  },
  // version 2
  function (cb) {
    // migrate all saved archives to use saveClaims
    pump(
      archiveUserSettingsDb.createReadStream(),
      transform((chunk, cb) => {
        // look for archives saved with the old schema
        if (!chunk.value.isSaved || chunk.value.saveClaims) return cb() // noop
        // update the user settings to the new format
        chunk.value.saveClaims = ['beaker:archives']
        archiveUserSettingsDb.put(chunk.key, chunk.value, cb)
        // trigger an update to the meta as well
        getOrLoadArchive(chunk.key).pullLatestArchiveMeta()
      }),
      noopWritable(),
      err => {
        if (err) cb(err)
        // done
        db.put('version', 2, cb)
      }
    )
  }
]
