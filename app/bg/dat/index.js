import * as logLib from '../logger'
const logger = logLib.child({category: 'dat', subcategory: 'protocol'})
import * as childProcess from 'child_process'
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

  downloadPromises[key] = runConvertProcess(
    '/Users/paulfrazee/work/beaker-dat-legacy-tools/test-data',
    key,
    storagePath
  )

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

async function runConvertProcess (...args) {
  var fullModulePath = require.resolve('@beaker/dat-legacy-tools/bin.js')
  const opts = {
    stdio: 'inherit',
    env: Object.assign({}, process.env, {
      ELECTRON_RUN_AS_NODE: 1,
      ELECTRON_NO_ASAR: 1
    })
  }
  var proc = childProcess.fork(fullModulePath, args, opts)

  return new Promise((resolve, reject) => {
    proc.on('error', reject)
    proc.on('close', resolve)
  })
}
