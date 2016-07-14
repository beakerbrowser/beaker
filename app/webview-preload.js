import * as commandHandlers from './webview-preload/command-handlers'
import * as contextMenu from './webview-preload/context-menu'
import * as statusBarHover from './webview-preload/status-bar-hover'
import * as zoom from './webview-preload/zoom'
import * as fs from './lib/fg/fs-api'
import bookmarks from './lib/fg/bookmarks-api'
import sitedata from './lib/fg/sitedata-api'
import history from './lib/fg/history-api'
import dat from './lib/fg/dat-api'

// it would be better to import this from package.json
const BEAKER_VERSION = '0.0.1'

// setup APIs
fs.setup()

// setup UI
commandHandlers.setup()
contextMenu.setup()
statusBarHover.setup()
zoom.setup()

// export privileged APIs
// =

// builtin pages
if (window.location.protocol == 'beaker:' || window.location.protocol == 'view-dat:') {
  window.beaker = {
    version: BEAKER_VERSION,
    bookmarks,
    fs: fs.getSandboxAPI(),
    history,
    dat
  }
}

// p2p apps
if (window.location.protocol == 'dat:') {
  window.beaker = {
    version: BEAKER_VERSION,
    fs: fs.getSandboxAPI()
  }
}