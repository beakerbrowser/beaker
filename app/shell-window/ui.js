import { ipcRenderer } from 'electron'
import url from 'url'
import * as tabs from './ui/tabs'
import * as navbar from './ui/navbar'
import * as pages from './pages'
import * as commandHandlers from './command-handlers'
import * as swipeHandlers from './swipe-handlers'
import errorPage from '../lib/error-page'

export function setup () {
  if (window.process.platform == 'darwin') {
    document.body.classList.add('darwin')
  }

  ipcRenderer.on('protocol-not-supported', onProtocolNotSupported)
  ipcRenderer.on('window-event', onWindowEvent)
  tabs.setup()
  navbar.setup()
  commandHandlers.setup()
  swipeHandlers.setup()
  pages.loadPinnedFromDB(() => pages.setActive(pages.create(pages.DEFAULT_URL)))
}

function onProtocolNotSupported () {
  var page = pages.getActive()
  var protocol = url.parse(page.getIntendedURL()).protocol

  // render failure page
  var errorPageHTML = errorPage('The ' + (''+protocol).replace(/</g, '') + ' protocol is not installed in Beaker.')
  page.webviewEl.getWebContents().executeJavaScript('document.documentElement.innerHTML = \''+errorPageHTML+'\'')
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