import _pick from 'lodash.pick'
import through2 from 'through2'
import * as datLibrary from '../../networks/dat/library'
import * as archivesDb from '../../dbs/archives'
import {checkLabsPerm} from '../../ui/permissions'
import {PermissionsError} from 'beaker-error-constants'

// constants
// =

const API_DOCS_URL = 'https://TODO' // TODO
const API_PERM_ID = 'experimentalLibrary'
const REQUEST_ADD_PERM_ID = 'experimentalLibraryRequestAdd'
const REQUEST_REMOVE_PERM_ID = 'experimentalLibraryRequestRemove'
const LAB_API_ID = 'library'

const QUERY_FIELDS = ['inMemory', 'isSaved', 'isNetworked', 'isOwner']
const USER_SETTINGS_FIELDS = ['isSaved', 'expiresAt']
const ARCHIVE_FIELDS = ['url', 'title', 'description', 'size', 'mtime', 'isOwner', 'userSettings', 'peers']
const EVENT_FIELDS = {
  added: ['url', 'isSaved'],
  removed: ['url', 'isSaved'],
  updated: ['url', 'title', 'description', 'size', 'mtime', 'isOwner'],
  'folder-synced': ['url', 'direction'],
  'network-changed': ['url', 'peerCount']
}

// exported api
// =

function add (isRequest) {
  return async function (url, {duration} = {}) {
    var key = datLibrary.fromURLToKey(url)
    if (isRequest) await checkIsntOwner(key)
    await checkLabsPerm({
      perm: isRequest ? `${REQUEST_ADD_PERM_ID}:${key}` : API_PERM_ID,
      labApi: LAB_API_ID,
      apiDocsUrl: API_DOCS_URL,
      sender: this.sender
    })

    // swarm the archive
    /* dont await */ datLibrary.getOrLoadArchive(key)

    // update settings
    var opts = {isSaved: true}
    if (duration && duration > 0) {
      opts.expiresAt = Date.now() + (duration * 60e3)
    }
    var settings = await archivesDb.setUserSettings(0, key, opts)
    return _pick(settings, USER_SETTINGS_FIELDS)
  }
}

function remove (isRequest) {
  return async function (url) {
    var key = datLibrary.fromURLToKey(url)
    if (isRequest) await checkIsntOwner(key)
    await checkLabsPerm({
      perm: isRequest ? `${REQUEST_ADD_PERM_ID}:${key}` : API_PERM_ID,
      labApi: LAB_API_ID,
      apiDocsUrl: API_DOCS_URL,
      sender: this.sender
    })
    var settings = await archivesDb.setUserSettings(0, key, {isSaved: false})
    return _pick(settings, USER_SETTINGS_FIELDS)
  }
}

export default {

  add: add(false),
  requestAdd: add(true),

  remove: remove(false),
  requestRemove: remove(true),

  async get (url) {
    await checkLabsPerm({
      perm: API_PERM_ID,
      labApi: LAB_API_ID,
      apiDocsUrl: API_DOCS_URL,
      sender: this.sender
    })
    var key = datLibrary.fromURLToKey(url)
    var settings = await archivesDb.getUserSettings(0, key)
    return _pick(settings, USER_SETTINGS_FIELDS)
  },

  async list (query = {}) {
    await checkLabsPerm({
      perm: API_PERM_ID,
      labApi: LAB_API_ID,
      apiDocsUrl: API_DOCS_URL,
      sender: this.sender
    })
    var query = _pick(query, QUERY_FIELDS)
    var archives = await datLibrary.queryArchives(query)
    return archives.map(a => {
      a = _pick(a, ARCHIVE_FIELDS)
      a.userSettings = _pick(a.userSettings, USER_SETTINGS_FIELDS)
      return a
    })
  },

  async createEventStream () {
    await checkLabsPerm({
      perm: API_PERM_ID,
      labApi: LAB_API_ID,
      apiDocsUrl: API_DOCS_URL,
      sender: this.sender
    })
    return datLibrary.createEventStream().pipe(through2.obj(function (event, enc, cb) {
      // only emit events that have a fields set
      var fields = EVENT_FIELDS[event[0]]
      if (fields) {
        event[1] = _pick(event[1].details, fields)
        this.push(event)
      }
      cb()
    }))
  }
}

// internal methods
// =

async function checkIsntOwner (key) {
  var meta = await archivesDb.getMeta(key)
  if (meta.isOwner) throw new PermissionsError('Archive is owned by user')
}