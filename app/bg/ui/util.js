import * as modals from './subwindows/modals'
import * as tabManager from './tab-manager'
import navigatorWebAPI from '../web-apis/bg/navigator'
import { UserDeniedError } from 'beaker-error-constants'

export async function runCloneFlow (win, url) {
  var res
  try {
    res = await modals.create(win.webContents, 'clone-drive', {url})
  } catch (e) {
    if (e.name !== 'Error') {
      throw e // only rethrow if a specific error
    }
  }
  if (!res || !res.url) throw new UserDeniedError()
  return res.url
}

export async function runDiffMergeFlow (win, url) {
  var target = await navigatorWebAPI.selectFileDialog.call(
    {sender: win},
    {
      title: 'Select a folder to compare against',
      select: ['folder']
    }
  )
  var url = `beaker://compare/?base=${url}&target=${target[0].url}`
  tabManager.create(win, url, {setActive: true, adjacentActive: true})
}

export async function runDrivePropertiesFlow (win, key) {
  await navigatorWebAPI.drivePropertiesDialog.call({sender: win}, key)
}