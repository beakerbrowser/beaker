import { ipcRenderer } from 'electron'
import * as tabs from './ui/tabs'
import * as navbar from './ui/navbar'
import * as pages from './pages'
import * as commandHandlers from './command-handlers'
import * as swipeHandlers from './swipe-handlers'

export function setup () {
  if (window.process.platform == 'darwin') {
    document.body.classList.add('darwin')
  }

  ipcRenderer.on('window-event', onWindowEvent)
  tabs.setup()
  navbar.setup()
  commandHandlers.setup()
  swipeHandlers.setup()
  pages.loadPinnedFromDB(() => pages.setActive(pages.create(pages.DEFAULT_URL)))
}

function onWindowEvent (event, type) {
  if (type == 'blur')
    document.body.classList.add('window-blurred')
  if (type == 'focus') {
    document.body.classList.remove('window-blurred')
    try { pages.getActive().webviewEl.focus() }
    catch (e) {}
  }
  if (type == 'enter-full-screen')
    document.body.classList.add('fullscreen')
  if (type == 'leave-full-screen')
    document.body.classList.remove('fullscreen')
}