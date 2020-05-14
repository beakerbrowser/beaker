// HACK
// window.close() will just crash the page's webcontents
// the proper behavior is this:
// - if the page was opened by a script, then close the tab
// - otherwise, do nothing

import { ipcRenderer, contextBridge, webFrame } from 'electron'

export default function () {
  contextBridge.exposeInMainWorld('__internalOpen__', {
    markNextTabScriptClosable: () => {
      ipcRenderer.sendSync('BEAKER_MARK_NEXT_TAB_SCRIPTCLOSEABLE')
    },
    tryClose: () => {
      return ipcRenderer.sendSync('BEAKER_SCRIPTCLOSE_SELF')
    }
  })
  webFrame.executeJavaScript(`
  var origOpen = window.open
  Object.defineProperty(window, 'open', {
    get: () => function (...args) {
      if (args[1] !== '_self') window.__internalOpen__.markNextTabScriptClosable()
      return origOpen.apply(window, args)
    },
    set: () => {}
  })
  Object.defineProperty(window, 'close', {
    get: () => function () {
      if (!window.__internalOpen__.tryClose()) {
        console.warn('Scripts may not close windows that were not opened by script.')
      }
    },
    set: () => {}
  })
  `)
}