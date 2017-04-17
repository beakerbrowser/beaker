import {BrowserWindow} from 'electron'
import {parse as parseURL} from 'url'
import pda from 'pauls-dat-api'
import * as datLibrary from '../networks/dat/library'
import * as archivesDb from '../dbs/archives'
import {DAT_HASH_REGEX} from '../../lib/const'
import {showModal} from '../ui/modals'
import {PermissionsError, InvalidURLError} from 'beaker-error-constants'

// exported api
// =

export default {
  async status() {
    var status = {archives: 0, peers: 0}
    var archives = datLibrary.getActiveArchives()
    for (var k in archives) {
      status.archives++
      status.peers += archives[k].metadata.peers.length
    }
    return status
  },

  async create({title, description, createdBy} = {}) {
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
    // update settings
    var res = await archivesDb.setUserSettings(0, key, {isSaved: true})
    // pull metadata
    var archive = await datLibrary.getOrLoadArchive(key)
    datLibrary.pullLatestArchiveMeta(archive)
    return res
  },

  async remove(url) {
    assertTmpBeakerOnly(this.sender)
    var key = toKey(url)
    return archivesDb.setUserSettings(0, key, {isSaved: false})
  },

  async updateManifest(url, manifestInfo) {
    assertTmpBeakerOnly(this.sender)

    if (!manifestInfo) {
      // show the update-info the modal
      var win = BrowserWindow.fromWebContents(this.sender)
      await assertSenderIsFocused(this.sender)
      return await showModal(win, 'create-archive', {url})
    }

    // do a direct update
    var key = toKey(url)
    var archive = await datLibrary.getOrLoadArchive(key)
    var archiveInfo = await archivesDb.getMeta(key)
    var {title, description} = manifestInfo
    title = typeof title !== 'undefined' ? title : archiveInfo.title
    description = typeof description !== 'undefined' ? description : archiveInfo.description
    await pda.updateManifest(archive, {title, description})
    datLibrary.pullLatestArchiveMeta(archive)
  },

  async list(query={}) {
    assertTmpBeakerOnly(this.sender)
    return datLibrary.queryArchives(query, {includeMeta: true})
  },

  async get(url) {
    assertTmpBeakerOnly(this.sender)
    var key = toKey(url)
    return datLibrary.getArchiveInfo(key)
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

async function assertSenderIsFocused (sender) {
  if (!sender.isFocused()) {
    throw new UserDeniedError('Application must be focused to spawn a prompt')
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