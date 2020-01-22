import hyperDns from '../../hyper/dns'
import * as drives from '../../hyper/drives'
import * as archivesDb from '../../dbs/archives'
import { listDrives, configDrive, removeDrive, isRootUrl } from '../../filesystem/index'
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

  async get (key) {
    key = await drives.fromURLToKey(key, true)
    var drive = listDrives().find(drive => drive.key === key)
    var info = await drives.getDriveInfo(key).catch(e => {})
    var url = `hd://${key}`
    var ident = getIdent(url)
    return {
      key,
      url,
      info,
      saved: !!drive,
      seeding: ident.user || (drive ? drive.seeding : false),
      ident
    }
  },

  async list () {
    var records = []
    for (let drive of listDrives()) {
      let url = `hd://${drive.key}`
      let ident = getIdent(url)
      records.push({
        key: drive.key,
        url,
        info: await drives.getDriveInfo(drive.key).catch(e => {}),
        saved: true,
        seeding: ident.user || drive.seeding,
        ident
      })
    }
    return records
  },

  async configure (key, opts) {
    return configDrive(key, opts)
  },

  async remove (key) {
    return removeDrive(key)
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

function getIdent (url) {
  var home = isRootUrl(url)
  var user = users.isUser(url)
  return {system: home || user, home, user}
}