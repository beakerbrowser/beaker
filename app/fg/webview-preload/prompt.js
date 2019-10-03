/*
This provides window.prompt(), which electron does not do for us.
*/

import {ipcRenderer} from 'electron'

// exported api
// =

export function setup () {
  // we have use ipc directly instead of using rpc, because we need custom
  // repsonse-lifecycle management in the main thread
  window.prompt = (message, def) => (
    ipcRenderer.sendSync('page-prompt-dialog', message, def)
  )
}
