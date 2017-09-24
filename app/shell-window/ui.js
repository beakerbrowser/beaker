import { webFrame, ipcRenderer } from 'electron'
import * as tabs from './ui/tabs'
import * as navbar from './ui/navbar'
import * as statusbar from './ui/statusbar'
import * as pages from './pages'
import * as commandHandlers from './command-handlers'
import * as swipeHandlers from './swipe-handlers'

export function setup (cb) {
  if (window.process.platform == 'darwin') {
    document.body.classList.add('darwin')
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

  // attach some window globals
  window.pages = pages

  // setup subsystems
  tabs.setup()
  navbar.setup()
  statusbar.setup()
  commandHandlers.setup()
  swipeHandlers.setup()
  pages.setup()
  pages.setActive(pages.create(pages.FIRST_TAB_URL))
  cb()
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
  }
}

