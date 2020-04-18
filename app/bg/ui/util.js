import * as modals from './subwindows/modals'
import shellWebAPI from '../web-apis/bg/shell'
import drivesWebAPI from '../web-apis/bg/drives'
import hyper from '../hyper/index'
import * as filesystem from '../filesystem/index'
import pda from 'pauls-dat-api2'
import { UserDeniedError } from 'beaker-error-constants'

export async function runNewDriveFlow (win) {
  let res
  try {
    res = await modals.create(win.webContents, 'create-drive', {})
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

export async function runCloneFlow (win, url) {
  var res
  try {
    let forks = await drivesWebAPI.getForks(url)
    res = await modals.create(win.webContents, 'fork-drive', {url, forks, detached: true})
  } catch (e) {
    if (e.name !== 'Error') {
      throw e // only rethrow if a specific error
    }
  }
  if (!res || !res.url) throw new UserDeniedError()
  return res.url
}

export async function runForkFlow (win, url) {
  var res
  try {
    let forks = await drivesWebAPI.getForks(url)
    res = await modals.create(win.webContents, 'fork-drive', {url, forks})
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