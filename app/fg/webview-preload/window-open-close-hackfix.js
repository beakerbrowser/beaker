// HACK
// window.close() will just crash the page's webcontents
// the proper behavior is this:
// - if the page was opened by a script, then close the tab
// - otherwise, do nothing
// but we're just going to do this:
// - always allow it

import { ipcRenderer, contextBridge, webFrame } from 'electron'

export default function () {
  contextBridge.exposeInMainWorld('__internalOpen__', {
    close: () => {
      return ipcRenderer.sendSync('BEAKER_SCRIPTCLOSE_SELF')
    }
  })
  webFrame.executeJavaScript(`
  Object.defineProperty(window, 'close', {
    get: () => function () {
      window.__internalOpen__.close()
    },
    set: () => {}
  })
  `)
}