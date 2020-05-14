/*
This provides window.prompt(), which electron does not do for us.
*/

import { ipcRenderer, contextBridge, webFrame } from 'electron'

// exported api
// =

export function setup () {
  // we have use ipc directly instead of using rpc, because we need custom
  // repsonse-lifecycle management in the main thread
  contextBridge.exposeInMainWorld('__internalPrompt__', {
    prompt: (message, def) => {
      return ipcRenderer.sendSync('page-prompt-dialog', message, def)
    }
  })
  webFrame.executeJavaScript(`
  Object.defineProperty(window, 'prompt', {
    get: () => (message, def) => window.__internalPrompt__.prompt(message, def),
    set: () => {}
  })
  `)
}
