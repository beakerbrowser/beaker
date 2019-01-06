/* globals beaker */

import { webFrame, ipcRenderer } from 'electron'
import * as tabs from './ui/tabs'
import * as navbar from './ui/navbar'
import * as statusbar from './ui/statusbar'
import * as win32Titlebar from './ui/win32-titlebar'
import * as pages from './pages'
import * as sidebar from './ui/sidebar'
import * as modal from './ui/modal'
import * as commandHandlers from './command-handlers'
import * as swipeHandlers from './swipe-handlers'

export function setup (cb) {
  var {platform} = beaker.browser.getInfo()
  if (platform === 'darwin') {
    document.body.classList.add('darwin')
  }
  if (platform === 'win32') {
    document.body.classList.add('win32')
  }

  // wire up event handlers
  ipcRenderer.on('window-event', onWindowEvent)
  document.addEventListener('dragover', preventDragDrop, false)
  document.addEventListener('drop', preventDragDrop, false)
  function preventDragDrop (event) {
    // important - dont allow drag/drop in the shell window, only into the webview
    if (!event.target || event.target.tagName != 'WEBVIEW') {
      event.preventDefault()
      return false
    }
  }

  // disable zooming in the shell window
  webFrame.setVisualZoomLevelLimits(1, 1)
  webFrame.setLayoutZoomLevelLimits(0, 0)

  // setup subsystems
  tabs.setup()
  navbar.setup()
  statusbar.setup()
  if (platform === 'win32') {
    win32Titlebar.setup()
  }
  commandHandlers.setup()
  swipeHandlers.setup()
  pages.setup()
  modal.setup()
  sidebar.setup()
  ipcRenderer.send('shell-window:pages-ready')
  pages.on('first-page', cb)
}

function onWindowEvent (event, type) {
  switch (type) {
    case 'blur': return document.body.classList.add('window-blurred')
    case 'focus':
      document.body.classList.remove('window-blurred')
      try { pages.getActive().webviewEl.focus() } catch (e) {}
      break
    case 'enter-full-screen': return document.body.classList.add('fullscreen')
    case 'leave-full-screen': return document.body.classList.remove('fullscreen')
    case 'leave-page-full-screen': pages.leavePageFullScreen()
  }
}
