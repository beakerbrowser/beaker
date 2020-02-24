import hyperDns from '../../hyper/dns'
import * as drives from '../../hyper/drives'
import * as archivesDb from '../../dbs/archives'
import { listDrives, configDrive, removeDrive, getDriveIdent } from '../../filesystem/index'
import * as trash from '../../filesystem/trash'
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
    var url = `hyper://${key}`
    var ident = getDriveIdent(url)
    return {
      key,
      url,
      info,
      saved: !!drive,
      seeding: ident.user || (drive ? drive.seeding : false),
      forkOf: drive ? drive.forkOf : undefined,
      ident
    }
  },

  async list (opts) {
    return assembleRecords(listDrives(opts))
  },

  async getForks (key) {
    key = await drives.fromURLToKey(key, true)
    var drivesList = listDrives()
    var rootDrive = drivesList.find(drive => drive.key === key)
    if (!rootDrive) return assembleRecords([{key, seeding: false}])

    // find root of the tree
    var seenKeys = new Set() // used to break cycles
    while (rootDrive.forkOf && rootDrive.forkOf.key && !seenKeys.has(rootDrive.forkOf.key)) {
      seenKeys.add(rootDrive.key)
      rootDrive = drivesList.find(drive2 => drive2.key === rootDrive.forkOf.key)
    }

    // build the tree
    var forks = []
    function addForksOf (drive) {
      if (forks.includes(drive)) return // cycle
      forks.push(drive)
      for (let drive2 of drivesList) {
        if (drive2.forkOf && drive2.forkOf.key === drive.key) {
          addForksOf(drive2)
        }
      }
    }
    addForksOf(rootDrive)

    return assembleRecords(forks)
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

async function assembleRecords (drivesList) {
  var records = []
  for (let drive of drivesList) {
    let url = `hyper://${drive.key}`
    let ident = getDriveIdent(url)
    records.push({
      key: drive.key,
      url,
      info: await drives.getDriveInfo(drive.key).catch(e => {}),
      saved: true,
      seeding: ident.user || drive.seeding,
      forkOf: drive ? drive.forkOf : undefined,
      ident
    })
  }
  return records
}