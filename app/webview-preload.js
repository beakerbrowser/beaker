import * as commandHandlers from './webview-preload/command-handlers'
import * as contextMenu from './webview-preload/context-menu'
import * as statusBarHover from './webview-preload/status-bar-hover'
import * as zoom from './webview-preload/zoom'
import * as fsAPI from './lib/fg/fs-api'
import * as bookmarksAPI from './lib/fg/bookmarks-api'
import * as sitedata from './lib/fg/sitedata-api'

// it would be better to import this from package.json
const BEAKER_VERSION = '0.0.1'

// setup standard behaviors
commandHandlers.setup()
contextMenu.setup()
statusBarHover.setup()
zoom.setup()
fsAPI.setup()

// export privileged APIs
// =

// builtin pages
if (window.location.protocol == 'beaker:') {
  window.beaker = {
    version: BEAKER_VERSION,
    bookmarks: bookmarksAPI,
    fs: fsAPI.getSandboxAPI()
  }
}

// p2p apps
if (window.location.protocol == 'dat:') {
  window.beaker = {
    version: BEAKER_VERSION,
    fs: fsAPI.getSandboxAPI()
  }
}