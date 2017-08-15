import {BrowserWindow} from 'electron'
import {parse as parseURL} from 'url'
import pda from 'pauls-dat-api'
import datDns from '../networks/dat/dns'
import * as datLibrary from '../networks/dat/library'
import * as archivesDb from '../dbs/archives'
import {DAT_HASH_REGEX, DEFAULT_DAT_API_TIMEOUT} from '../../lib/const'
import {showModal} from '../ui/modals'
import {timer} from '../../lib/time'
import {
  ArchiveNotWritableError,
  InvalidURLError,
  InvalidPathError,
  UserDeniedError
} from 'beaker-error-constants'

// exported api
// =

const to = (opts) =>
  (opts && typeof opts.timeout !== 'undefined')
    ? opts.timeout
    : DEFAULT_DAT_API_TIMEOUT

export default {
  async status () {
    var status = {archives: 0, peers: 0}
    var archives = datLibrary.getActiveArchives()
    for (var k in archives) {
      status.archives++
      status.peers += archives[k].metadata.peers.length
    }
    return status
  },

  async create ({title, description} = {}) {
    return datLibrary.createNewArchive({title, description})
  },

  async fork (url, {title, description} = {}) {
    return datLibrary.forkArchive(url, {title, description})
  },

  async update (url, manifestInfo, userSettings) {
    var key = toKey(url)
    var archive = await datLibrary.getOrLoadArchive(key)

    // no info provided: open modal
    if (!manifestInfo && !userSettings) {
      if (!archive.writable) {
        throw new ArchiveNotWritableError()
      }
      // show the update-info the modal
      let win = BrowserWindow.fromWebContents(this.sender)
      await assertSenderIsFocused(this.sender)
      return showModal(win, 'create-archive', {url})
    }

    // update manifest file
    if (manifestInfo) {
      var archiveInfo = await archivesDb.getMeta(key)
      var {title, description} = manifestInfo
      title = typeof title !== 'undefined' ? title : archiveInfo.title
      description = typeof description !== 'undefined' ? description : archiveInfo.description
      if (title !== archiveInfo.title || description !== archiveInfo.description) {
        await pda.updateManifest(archive, {title, description})
        datLibrary.pullLatestArchiveMeta(archive)
      }
    }

    // update settings
    if (userSettings) {
      userSettings = await archivesDb.setUserSettings(0, key, userSettings)
    }
  },

  async add (url) {
    var key = toKey(url)

    // pull metadata
    var archive = await datLibrary.getOrLoadArchive(key)
    var meta = await datLibrary.pullLatestArchiveMeta(archive)

    // update settings
    return archivesDb.setUserSettings(0, key, {isSaved: true})
  },

  async remove (url) {
    var key = toKey(url)
    return archivesDb.setUserSettings(0, key, {isSaved: false})
  },

  async bulkRemove (urls) {
    var results = []

    // sanity check
    if (!urls || !Array.isArray(urls)) {
      return []
    }

    for (var i = 0; i < urls.length; i++) {
      let key = toKey(urls[i])
      results.push(await archivesDb.setUserSettings(0, key, {isSaved: false}))
    }
    return results
  },

  async restore (url) {
    var key = toKey(url)
    return archivesDb.getUserSettings(0, key)
  },

  async list (query = {}) {
    return datLibrary.queryArchives(query)
  },

  async get (url, opts) {
    return timer(to(opts), async (checkin) => {
      return datLibrary.getArchiveInfo(toKey(url))
    })
  },

  async clearFileCache (url) {
    return datLibrary.clearFileCache(toKey(url))
  },

  clearDnsCache () {
    datDns.flushCache()
  },

  createEventStream () {
    return datLibrary.createEventStream()
  },

  createDebugStream () {
    return datLibrary.createDebugStream()
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
