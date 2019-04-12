// HACK
// window.close() will just crash the page's webcontents
// the proper behavior is this:
// - if the page was opened by a script, then close the tab
// - otherwise, do nothing

import {ipcRenderer} from 'electron'

export default function () {
  var origOpen = window.open
  window.open = function (...args) {
    if (args[1] !== '_self') ipcRenderer.sendSync('BEAKER_MARK_NEXT_VIEW_SCRIPTCLOSEABLE')
    return origOpen.apply(window, args)
  }
  window.close = function () {
    if (!ipcRenderer.sendSync('BEAKER_SCRIPTCLOSE_SELF')) {
      console.warn('Scripts may not close windows that were not opened by script.')
    }
  }
}