import { webFrame, ipcRenderer } from 'electron'
import * as tabs from './ui/tabs'
import * as navbar from './ui/navbar'
import * as statusbar from './ui/statusbar'
import * as win32Titlebar from './ui/win32-titlebar'
import * as pages from './pages'
import * as modal from './ui/modal'
import * as commandHandlers from './command-handlers'
import * as swipeHandlers from './swipe-handlers'

export function setup (cb) {
  if (window.process.platform == 'darwin') {
    document.body.classList.add('darwin')
  }
  if (window.process.platform == 'win32') {
    document.body.classList.add('win32')
  }

  // wire up event handlers
  ipcRenderer.on('window-event', onWindowEvent)
  document.addEventListener('dragover', onDragOver, false)
  document.addEventListener('dragleave', onDragLeave, false)
  document.addEventListener('dragexit', onDragLeave, false)
  document.addEventListener('drop', onDrop, false)

  function onDragLeave (event) {
    const targetIsDropZone = event.target.classList.contains('drop-zone')

    if (targetIsDropZone) {
      event.target.classList.remove('drag-over')
    }
  }

  function onDragOver (event) {
    const targetIsDropZone = event.target.classList.contains('drop-zone')
    const targetIsWebview = event.target.tagName === 'WEBVIEW'

    if (targetIsDropZone) {
      event.target.classList.add('drag-over')
    }

    // important - dont allow drag/drop in the shell window, only into the webview or drop zones
    if (!event.target || !targetIsWebview || !targetIsDropZone) {
      event.preventDefault()
      return false
    }
  }

  function onDrop (event) {
    const targetIsDropZone = event.target.classList.contains('drop-zone')
    const targetIsWebview = event.target.tagName === 'WEBVIEW'

    if (targetIsDropZone) {
      event.target.classList.remove('drag-over')
    }

    // important - dont allow drag/drop in the shell window, only into the webview or drop zones
    if (!event.target || !targetIsWebview || !targetIsDropZone) {
      event.preventDefault()
      return false
    }
  }

  // disable zooming in the shell window
  webFrame.setVisualZoomLevelLimits(1, 1)
  webFrame.setLayoutZoomLevelLimits(0, 0)

  // attach some window globals
  window.pages = pages
  window.navbar = navbar

  // setup subsystems
  tabs.setup()
  navbar.setup()
  statusbar.setup()
  if (window.process.platform == 'win32') {
    win32Titlebar.setup()
  }
  commandHandlers.setup()
  swipeHandlers.setup()
  pages.setup()
  modal.setup()
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
