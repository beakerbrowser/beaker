import hyperDns from '../../hyper/dns'
import * as drives from '../../hyper/drives'
import * as archivesDb from '../../dbs/archives'
import * as trash from '../../filesystem/trash'
import * as users from '../../filesystem/users'
import { PermissionsError } from 'beaker-error-constants'

// exported api
// =

export default {
  async status () {
    var status = {drives: 0, peers: 0}
    var drives = drives.getActiveDrives()
    for (var k in drives) {
      status.drives++
      status.peers += drives[k].metadata.peers.length
    }
    return status
  },

  async collectTrash () {
    return trash.collect({olderThan: 0})
  },

  async delete (url) {
    // TODO
    // var drive = await drives.getOrLoadDrive(url)
    // assertDriveDeletable(drive.key)
    // await datLibrary.configureDrive(drive, {isSaved: false})
    // await drives.unloadDrive(drive.key)
    // var bytes = await archivesDb.deleteArchive(drive.key)
    // return {bytes}
  },

  async touch (key, timeVar, value) {
    return archivesDb.touch(key, timeVar, value)
  },

  async clearFileCache (url) {
    return drives.clearFileCache(await drives.fromURLToKey(url, true))
  },

  clearDnsCache () {
    hyperDns.flushCache()
  },

  createEventStream () {
    return drives.createEventStream()
  },

  getDebugLog (key) {
    return drives.getDebugLog(key)
  },

  createDebugStream () {
    return drives.createDebugStream()
  }
}

// internal methods
// =

function assertDriveDeletable (key) {
  if (users.isUser(`hd://${key}`)) {
    throw new PermissionsError('Unable to delete the user profile.')
  }
}

function massageRecord (record) {
  return {
    key: record.key,
    url: `hd://${record.key}`,
    author: record.author ? {
      url: record.author.url,
      title: record.author.title,
      description: record.author.description,
      type: record.author.type,
      writable: record.author.writable
    } : undefined,
    meta: {
      title: record.meta.title,
      description: record.meta.description,
      type: record.meta.type,
      mtime: record.meta.mtime,
      size: record.meta.size,
      author: record.meta.author,
      writable: record.meta.writable
    },
    isSaved: record.isSaved,
    isHosting: record.isHosting,
    visibility: record.visibility,
    savedAt: Number(record.savedAt)
  }
}