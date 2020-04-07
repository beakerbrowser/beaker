import * as logLib from '../logger'
const logger = logLib.child({category: 'dat', subcategory: 'protocol'})
import Dat from 'dat-node'
import mirror from 'mirror-folder'
import { tmpdir } from 'os'
import { join } from 'path'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import pda from 'pauls-dat-api2'
import hyper from '../hyper/index'
import * as filesystem from '../filesystem/index'

export function getStoragePathFor (key) {
  return join(tmpdir(), 'dat', key)
}

var downloadPromises = {}
export async function downloadDat (key) {
  if (downloadPromises[key]) {
    return downloadPromises[key]
  }

  var storagePath = getStoragePathFor(key)
  rimraf.sync(storagePath)
  mkdirp.sync(storagePath)

  downloadPromises[key] = new Promise((resolve, reject) => {
    Dat(storagePath, {key}, (err, dat) => {
      if (err) return reject(err)
      
      var network = dat.joinNetwork()
      network.on('connection', function () {
        logger.log('info', `Peer connected for ${key}`)
      })

      dat.archive.metadata.update(() => {
        logger.log('info', `Initiating sync for ${key}`)
        mirror({fs: dat.archive, name: '/'}, storagePath, (err) => {
          dat.leave()
          dat.close()
          logger.log('info', `Finished syncing ${key}`, {error: err ? err.toString() : false})

          if (err) reject(err)
          else resolve()
        })
      })
    })
  })

  return downloadPromises[key]
}

export async function convertDatArchive (key) {
  await downloadDat(key)

  var storagePath = getStoragePathFor(key)
  var drive = await hyper.drives.createNewDrive()
  await pda.exportFilesystemToArchive({
    srcPath: storagePath,
    dstArchive: drive.session.drive,
    dstPath: '/',
    inplaceImport: true
  })
  await filesystem.configDrive(drive.url)
  return drive.url
}