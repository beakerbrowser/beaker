import datDns from '../../dat/dns'
import * as datArchives from '../../dat/archives'
import * as archivesDb from '../../dbs/archives'
import * as datLibrary from '../../filesystem/dat-library'
import * as trash from '../../filesystem/trash'
import * as users from '../../filesystem/users'
import { PermissionsError } from 'beaker-error-constants'

// exported api
// =

export default {
  async status () {
    var status = {archives: 0, peers: 0}
    var archives = datArchives.getActiveArchives()
    for (var k in archives) {
      status.archives++
      status.peers += archives[k].metadata.peers.length
    }
    return status
  },

  async listTrash () {
    var records = await datLibrary.listTrash()
    return records.map(massageRecord)
  },

  async collectTrash () {
    return trash.collect({olderThan: 0})
  },

  async delete (url) {
    // TODO
    // var archive = await datArchives.getOrLoadArchive(url)
    // assertArchiveDeletable(archive.key)
    // await datLibrary.configureArchive(archive, {isSaved: false})
    // await datArchives.unloadArchive(archive.key)
    // var bytes = await archivesDb.deleteArchive(archive.key)
    // return {bytes}
  },

  async touch (key, timeVar, value) {
    return archivesDb.touch(key, timeVar, value)
  },

  async clearFileCache (url) {
    return datArchives.clearFileCache(await datArchives.fromURLToKey(url, true))
  },

  clearDnsCache () {
    datDns.flushCache()
  },

  createEventStream () {
    return datArchives.createEventStream()
  },

  getDebugLog (key) {
    return datArchives.getDebugLog(key)
  },

  createDebugStream () {
    return datArchives.createDebugStream()
  }
}

// internal methods
// =

function assertArchiveDeletable (key) {
  if (users.isUser(`dat://${key}`)) {
    throw new PermissionsError('Unable to delete the user profile.')
  }
}

function massageRecord (record) {
  return {
    key: record.key,
    url: `dat://${record.key}`,
    author: record.author ? {
      url: record.author.url,
      title: record.author.title,
      description: record.author.description,
      type: record.author.type,
      isOwner: record.author.isOwner
    } : undefined,
    meta: {
      title: record.meta.title,
      description: record.meta.description,
      type: record.meta.type,
      mtime: record.meta.mtime,
      size: record.meta.size,
      author: record.meta.author,
      forkOf: record.meta.forkOf,
      isOwner: record.meta.isOwner
    },
    isSaved: record.isSaved,
    isHosting: record.isHosting,
    visibility: record.visibility,
    savedAt: Number(record.savedAt)
  }
}