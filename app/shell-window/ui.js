import { remote, ipcRenderer } from 'electron'
import url from 'url'
import * as tabs from './ui/tabs'
import * as navbar from './ui/navbar'
import * as pages from './pages'
import * as commandHandlers from './command-handlers'
import * as swipeHandlers from './swipe-handlers'
import permsPrompt from './ui/prompts/permission'
import errorPage from '../lib/error-page'

export function setup (cb) {
  if (window.process.platform == 'darwin') {
    document.body.classList.add('darwin')
  }

  ipcRenderer.on('window-event', onWindowEvent)
  tabs.setup()
  navbar.setup()
  commandHandlers.setup()
  swipeHandlers.setup()
  remote.session.defaultSession.setPermissionRequestHandler(onPermissionRequestHandler)
  pages.loadPinnedFromDB().then(() => {
    pages.setActive(pages.create(pages.DEFAULT_URL))
    cb()
  })
}

function onProtocolNotSupported (webContents) {
  // render failure page
  var protocol = url.parse(webContents.getURL()).protocol
  var errorPageHTML = errorPage('The ' + (''+protocol).replace(/</g, '') + ' protocol is not installed in Beaker.')
  webContents.executeJavaScript('document.documentElement.innerHTML = \''+errorPageHTML+'\'')
}

function onPermissionRequestHandler (webContents, permission, cb) {
  const grant = () => {
    console.debug('Granting permission request for', permission, 'for', webContents.getURL())
    cb(true)
  }
  const deny = () => {
    console.debug('Denying permission request for', permission, 'for', webContents.getURL())
    cb(false)
  }

  // look up the page, deny if failed
  var page = pages.getByWebContents(webContents)
  if (!page)
    return deny()

  // run the prompt
  permsPrompt(permission, page, grant, deny)
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
