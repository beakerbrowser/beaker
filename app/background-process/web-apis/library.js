import {parse as parseURL} from 'url'
import * as datLibrary from '../networks/dat/library'
import * as archivesDb from '../dbs/archives'
import {DAT_HASH_REGEX} from '../../lib/const'
import {PermissionsError, InvalidURLError} from 'beaker-error-constants'

// exported api
// =

export default {
  async list(query={}) {
    assertTmpBeakerOnly(this.sender)
    return datLibrary.queryArchives(query, {includeMeta: true})
  },

  async get(url) {
    assertTmpBeakerOnly(this.sender)
    var key = toKey(url)
    return datLibrary.getArchiveInfo(key)
  },

  async create(opts={title, description, createdBy}) {
    assertTmpBeakerOnly(this.sender)

    // get origin info
    if (!createdBy) {
      createdBy = await datLibrary.generateCreatedBy(this.sender.getURL())
    } else if (typeof createdBy === 'string') {
      createdBy = await datLibrary.generateCreatedBy(createdBy)
    }

    // create the archive
    return datLibrary.createNewArchive({title, description, createdBy})
  },

  async fork(url, {title, description, createdBy} = {}) {
    assertTmpBeakerOnly(this.sender)

    // get origin info
    if (!createdBy) {
      createdBy = await datLibrary.generateCreatedBy(this.sender.getURL())
    } else if (typeof createdBy === 'string') {
      createdBy = await datLibrary.generateCreatedBy(createdBy)
    }

    // create the archive
    return datLibrary.forkArchive(url, {title, description, createdBy})
  },

  async add(url) {
    assertTmpBeakerOnly(this.sender)
    var key = toKey(url)
    return archivesDb.setArchiveUserSettings(key, {isSaved: true})
  },

  async remove(url) {
    assertTmpBeakerOnly(this.sender)
    var key = toKey(url)
    return archivesDb.setArchiveUserSettings(key, {isSaved: false})
  },

  createEventStream() {
    try {
      assertTmpBeakerOnly(this.sender)
    } catch (e) {
      return
    }
    return datLibrary.createEventStream()
  }
}

// temporary helper to make sure the call is made by a beaker: page
function assertTmpBeakerOnly (sender) {
  if (!sender.getURL().startsWith('beaker:')) {
    throw new PermissionsError()
  }
}

// helper to convert the given URL to a dat key
function toKey (url) {
  if (DAT_HASH_REGEX.test(url)) {
    // simple case: given the key
    return url
  } 
  
  var urlp = parseURL(url)

  // validate
  if (urlp.protocol !== 'dat:') {
    throw new InvalidURLError('URL must be a dat: scheme')
  }
  if (!DAT_HASH_REGEX.test(urlp.host)) {
    // TODO- support dns lookup?
    throw new InvalidURLError('Hostname is not a valid hash')
  }

  return urlp.host
}