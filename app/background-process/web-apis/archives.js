import datDns from '../networks/dat/dns'
import * as datLibrary from '../networks/dat/library'
import * as datGC from '../networks/dat/garbage-collector'
import * as archivesDb from '../dbs/archives'
// import * as profilesIngest from '../ingests/profiles' TODO(profiles) disabled -prf
import {DAT_HASH_REGEX} from '../../lib/const'
import {
  InvalidURLError,
  PermissionsError
} from 'beaker-error-constants'

// exported api
// =

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
    var key = datLibrary.fromURLToKey(url)

    // pull metadata
    var archive = await datLibrary.getOrLoadArchive(key)
    await datLibrary.pullLatestArchiveMeta(archive)

    // update settings
    opts.isSaved = true
    return archivesDb.setUserSettings(0, key, opts)
    beaker.archives.add(key)
  },

  async remove (url) {
    var key = datLibrary.fromURLToKey(url)
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
      let key = datLibrary.fromURLToKey(urls[i])
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
    throw new Error('Published archives are temporarily disabled')
    // TODO(profiles) disabled -prf
    // const profileRecord = await profilesIngest.getProfileRecord(0)
    // archiveUrl = typeof archiveUrl.url === 'string' ? archiveUrl.url : archiveUrl
    // const archiveInfo = await datLibrary.getArchiveInfo(archiveUrl)
    // return profilesIngest.getAPI().publishArchive(profileRecord.url, archiveInfo)
  },

  async unpublish (archiveUrl) {
    throw new Error('Published archives are temporarily disabled')
    // TODO(profiles) disabled -prf
    // const profileRecord = await profilesIngest.getProfileRecord(0)
    // archiveUrl = typeof archiveUrl.url === 'string' ? archiveUrl.url : archiveUrl
    // return profilesIngest.getAPI().unpublishArchive(profileRecord.url, archiveUrl)
  },

  async listPublished (opts) {
    throw new Error('Published archives are temporarily disabled')
    // TODO(profiles) disabled -prf
    // return profilesIngest.getAPI().listPublishedArchives(opts)
  },

  async countPublished (opts) {
    throw new Error('Published archives are temporarily disabled')
    // TODO(profiles) disabled -prf
    // return profilesIngest.getAPI().countPublishedArchives(opts)
  },

  async getPublishRecord (recordUrl) {
    throw new Error('Published archives are temporarily disabled')
    // TODO(profiles) disabled -prf
    // return profilesIngest.getAPI().getPublishedArchive(recordUrl)
  },

  // internal management
  // =

  async touch (key, timeVar) {
    return archivesDb.touch(key, timeVar)
  },

  async clearFileCache (url) {
    return datLibrary.clearFileCache(datLibrary.fromURLToKey(url))
  },

  async clearGarbage () {
    return datGC.collect({olderThan: 0, biggerThan: 0})
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

async function assertArchiveDeletable (key) {
  // TODO(profiles) disabled -prf
  // var profileRecord = await profilesIngest.getProfileRecord(0)
  // if ('dat://' + key === profileRecord.url) {
  //   throw new PermissionsError('Unable to delete the user archive.')
  // }
}
