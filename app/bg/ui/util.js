import * as modals from './subwindows/modals'
import shellWebAPI from '../web-apis/bg/shell'
import drivesWebAPI from '../web-apis/bg/drives'
import hyper from '../hyper/index'
import * as filesystem from '../filesystem/index'
import pda from 'pauls-dat-api2'
import { UserDeniedError } from 'beaker-error-constants'

export async function runSelectFileDialog (win, opts = {}) {
    var res
    try {
      res = await modals.create(win.webContents, 'select-file', opts)
    } catch (e) {
      if (e.name !== 'Error') throw e // only rethrow if a specific error
    }
    if (!res) throw new UserDeniedError()
    return res
}

export async function runNewDriveFlow (win) {
  let res
  try {
    res = await modals.create(win.webContents, 'create-drive', {})
    if (res && res.gotoSync) {
      await modals.create(win.webContents, 'folder-sync', {url: res.url, closeAfterSync: true})
    }
  } catch (e) {
    if (e.name !== 'Error') {
      throw e // only rethrow if a specific error
    }
  }
  if (!res || !res.url) throw new UserDeniedError()
  return res.url
}

export async function runNewDriveFromFolderFlow (folderPath) {
  let newDrive
  try {
    let manifest = {title: folderPath.split('/').pop()}
    newDrive = await hyper.drives.createNewDrive(manifest)
    await filesystem.configDrive(newDrive.url)
  } catch (e) {
    console.log(e)
    throw e
  }

  await pda.exportFilesystemToArchive({
    srcPath: folderPath,
    dstArchive: newDrive.session.drive,
    dstPath: '/',
    inplaceImport: true
  })

  return newDrive.url
}

export async function runForkFlow (win, url, {detached} = {detached: false}) {
  var res
  try {
    let forks = await drivesWebAPI.getForks(url)
    res = await modals.create(win.webContents, 'fork-drive', {url, forks, detached})
  } catch (e) {
    if (e.name !== 'Error') {
      throw e // only rethrow if a specific error
    }
  }
  if (!res || !res.url) throw new UserDeniedError()
  return res.url
}

export async function runDrivePropertiesFlow (win, key) {
  await shellWebAPI.drivePropertiesDialog.call({sender: win}, key)
}

export async function exportDriveToFilesystem (sourceUrl, targetPath) {
  var drive = await hyper.drives.getOrLoadDrive(sourceUrl)
  return pda.exportArchiveToFilesystem({
    srcArchive: drive.session.drive,
    srcPath: '/',
    dstPath: targetPath,
    overwriteExisting: true,
    skipUndownloadedFiles: false
  })
}

export async function importFilesystemToDrive (srcPath, targetUrl, {preserveFolder} = {preserveFolder: false}) {
  var targetUrlp = new URL(targetUrl)
  var drive = await hyper.drives.getOrLoadDrive(targetUrlp.hostname)
  return pda.exportFilesystemToArchive({
    srcPath,
    dstArchive: drive.session.drive,
    dstPath: targetUrlp.pathname,
    inplaceImport: !preserveFolder
  })
}