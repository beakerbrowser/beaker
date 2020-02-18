import * as modals from './subwindows/modals'
import navigatorWebAPI from '../web-apis/bg/navigator'
import { UserDeniedError } from 'beaker-error-constants'

export async function runForkFlow (win, url) {
  var res
  try {
    res = await modals.create(win.webContents, 'fork-drive', {url})
  } catch (e) {
    if (e.name !== 'Error') {
      throw e // only rethrow if a specific error
    }
  }
  if (!res || !res.url) throw new UserDeniedError()
  return res.url
}

export async function runDrivePropertiesFlow (win, key) {
  await navigatorWebAPI.drivePropertiesDialog.call({sender: win}, key)
}