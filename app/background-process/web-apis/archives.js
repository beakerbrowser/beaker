import path from 'path'
import mkdirp from 'mkdirp'
import datDns from '../networks/dat/dns'
import * as folderSync from '../networks/dat/folder-sync'
import * as datLibrary from '../networks/dat/library'
import * as datGC from '../networks/dat/garbage-collector'
import * as archivesDb from '../dbs/archives'
import {cbPromise} from '../../lib/functions'
import {timer} from '../../lib/time'
// import * as profilesIngest from '../ingests/profiles' TODO(profiles) disabled -prf

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

  async delete (url) {
    const key = datLibrary.fromURLToKey(url)
    await assertArchiveDeletable(key)
    await archivesDb.setUserSettings(0, key, {isSaved: false})
    await datLibrary.unloadArchive(key)
    const bytes = await archivesDb.deleteArchive(key)
    return {bytes}
  },

  async list (query = {}) {
    return datLibrary.queryArchives(query)
  },

  // folder sync
  // =

  async validateLocalSyncPath (key, localSyncPath) {
    key = datLibrary.fromURLToKey(key)
    localSyncPath = path.normalize(localSyncPath)

    // make sure the path is good
    try {
      await folderSync.assertSafePath(localSyncPath)
    } catch (e) {
      if (e.notFound) {
        return {doesNotExist: true}
      }
      throw e
    }

    // check for conflicts
    var archive = await datLibrary.getOrLoadArchive(key)
    var diff = await folderSync.diffListing(archive, {localSyncPath})
    diff = diff.filter(d => d.change === 'mod' && d.path !== '/dat.json')
    if (diff.length) {
      return {hasConflicts: true, conflicts: diff.map(d => d.path)}
    }

    return {}
  },

  async setLocalSyncPath (key, localSyncPath, opts = {}) {
    key = datLibrary.fromURLToKey(key)
    localSyncPath = localSyncPath ? path.normalize(localSyncPath) : null

    // disable path
    if (!localSyncPath) {
      await archivesDb.setUserSettings(0, key, {localSyncPath: ''})
      return
    }

    // load the archive
    var archive
    await timer(3e3, async (checkin) => { // put a max 3s timeout on loading the dat
      checkin('searching for dat')
      archive = await datLibrary.getOrLoadArchive(key)
    })

    // make sure the path is good
    try {
      await folderSync.assertSafePath(localSyncPath)
    } catch (e) {
      if (e.notFound) {
        // just create the folder
        await cbPromise(cb => mkdirp(localSyncPath, cb))
      } else {
        throw e
      }
    }

    // merge the archive & the folder
    // await folderSync.mergeArchiveAndFolder(archive, localSyncPath)

    // update the record
    await archivesDb.setUserSettings(0, key, {localSyncPath})
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

  async touch (key, timeVar, value) {
    return archivesDb.touch(key, timeVar, value)
  },

  async clearFileCache (url) {
    return datLibrary.clearFileCache(datLibrary.fromURLToKey(url))
  },

  async clearGarbage ({isOwner} = {}) {
    return datGC.collect({olderThan: 0, biggerThan: 0, isOwner})
  },

  clearDnsCache () {
    datDns.flushCache()
  },

  // events
  // =

  createEventStream () {
    return datLibrary.createEventStream()
  },

  getDebugLog (key) {
    return datLibrary.getDebugLog(key)
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
