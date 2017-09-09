import {BrowserWindow} from 'electron'
import {parse as parseURL} from 'url'
import pda from 'pauls-dat-api'
import datDns from '../networks/dat/dns'
import * as datLibrary from '../networks/dat/library'
import * as archivesDb from '../dbs/archives'
import * as profilesInjest from '../injests/profiles'
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

  // system state
  // =

  async status () {
    var status = {archives: 0, peers: 0}
    var archives = datLibrary.getActiveArchives()
    for (var k in archives) {
      status.archives++
      status.peers += archives[k].metadata.peers.length
    }
    return status
  },

  // local cache management and querying
  // =

  async add (url, opts = {}) {
    var key = toKey(url)

    // pull metadata
    var archive = await datLibrary.getOrLoadArchive(key)
    var meta = await datLibrary.pullLatestArchiveMeta(archive)

    // update settings
    return archivesDb.setUserSettings(0, key, {isSaved: true, expiresAt: opts.expiresAt})
  },

  async remove (url) {
    var key = toKey(url)
    await assertArchiveDeletable(key)
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
      await assertArchiveDeletable(key)
      results.push(await archivesDb.setUserSettings(0, key, {isSaved: false}))
    }
    return results
  },

  async list (query = {}) {
    return datLibrary.queryArchives(query)
  },

  // publishing
  // =

  async publish (archiveUrl) {
    const profileRecord = await profilesInjest.getProfileRecord(0)
    archiveUrl = typeof archiveUrl.url === 'string' ? archiveUrl.url : archiveUrl
    const archiveInfo = await datLibrary.getArchiveInfo(archiveUrl)
    return profilesInjest.getAPI().publishArchive(profileRecord.url, archiveInfo)
  },

  async unpublish (archiveUrl) {
    const profileRecord = await profilesInjest.getProfileRecord(0)
    archiveUrl = typeof archiveUrl.url === 'string' ? archiveUrl.url : archiveUrl
    return profilesInjest.getAPI().unpublishArchive(profileRecord.url, archiveUrl)
  },

  async listPublished (opts) {
    return profilesInjest.getAPI().listPublishedArchives(opts)
  },

  async countPublished (opts) {
    return profilesInjest.getAPI().countPublishedArchives(opts)
  },

  async getPublishRecord (recordUrl) {
    return profilesInjest.getAPI().getPublishedArchive(recordUrl)
  },

  // internal management
  // =

  async clearFileCache (url) {
    return datLibrary.clearFileCache(toKey(url))
  },

  clearDnsCache () {
    datDns.flushCache()
  },

  // events
  // =

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

async function assertArchiveOfflineable (key) {
  var profileRecord = await profilesInjest.getProfileRecord(0)
  if ('dat://' + key === profileRecord.url) {
    throw new PermissionsError('Unable to set the user archive to offline.')
  }
}

async function assertArchiveDeletable (key) {
  var profileRecord = await profilesInjest.getProfileRecord(0)
  if ('dat://' + key === profileRecord.url) {
    throw new PermissionsError('Unable to delete the user archive.')
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
