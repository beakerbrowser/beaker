import { app } from 'electron'
import * as childProcess from 'child_process'
import { tmpdir } from 'os'
import { join } from 'path'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import pda from 'pauls-dat-api2'
import hyper from '../hyper/index'
import * as filesystem from '../filesystem/index'
import * as prompts from '../ui/subwindows/prompts'

var tmpdirs = {}
export function getStoragePathFor (key) {
  if (tmpdirs[key]) return tmpdirs[key]
  tmpdirs[key] = join(tmpdir(), 'dat', key)
  return tmpdirs[key]
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
    app.getPath('userData'),
    key,
    storagePath
  )

  return downloadPromises[key]
}

export async function convertDatArchive (win, key) {
  await downloadDat(key)

  var storagePath = getStoragePathFor(key)
  var drive = await hyper.drives.createNewDrive()

  // calculate size of import for progress
  var numFilesToImport = 0
  let stats = await pda.exportFilesystemToArchive({
    srcPath: storagePath,
    dstArchive: drive.session.drive,
    dstPath: '/',
    inplaceImport: true,
    dryRun: true
  })
  numFilesToImport += stats.fileCount

  var prompt = await prompts.create(win.webContents, 'progress', {label: 'Converting dat...'})
  try {
    await pda.exportFilesystemToArchive({
      srcPath: storagePath,
      dstArchive: drive.session.drive,
      dstPath: '/',
      inplaceImport: true,
      progress (stats) {
        prompt.webContents.executeJavaScript(`updateProgress(${stats.fileCount / numFilesToImport}); undefined`)
      }
    })
  } finally {
    prompts.close(prompt.tab)
  }

  await drive.pda.rename('/dat.json', drive.session.drive, '/index.json').catch(e => undefined)
  await filesystem.configDrive(drive.url)
  return drive.url
}

async function runConvertProcess (...args) {
  var fullModulePath = join(__dirname, 'bg', 'dat', 'converter', 'index.js')
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
