import {dialog} from 'electron'
import jetpack from 'fs-jetpack'

export async function checkFolderIsEmpty (dst, {noPrompt} = {}) {
  // check if there are files in the destination path
  try {
    var files = await jetpack.listAsync(dst)
    if (files && files.length > 0) {
      if (noPrompt) return false
      // ask the user if they're sure
      var {response} = await dialog.showMessageBox({
        type: 'question',
        message: 'This folder is not empty. Some files may be overwritten. Continue?',
        buttons: ['Yes', 'No, cancel']
      })
      if (response != 0) {
        return false
      }
    }
  } catch (e) {
    // no files
  }
  return true
}
