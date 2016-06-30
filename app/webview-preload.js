import * as commandHandlers from './webview-preload/command-handlers'
import * as contextMenu from './webview-preload/context-menu'
import * as statusBarHover from './webview-preload/status-bar-hover'
import * as zoom from './webview-preload/zoom'
import * as fs from './lib/fg/fs-api'
import * as bookmarks from './lib/fg/bookmarks-api'
import * as sitedata from './lib/fg/sitedata-api'
import * as history from './lib/fg/history-api'

// it would be better to import this from package.json
const BEAKER_VERSION = '0.0.1'

// setup standard behaviors
sitedata.setup()
history.setup()
bookmarks.setup()
fs.setup()
commandHandlers.setup()
contextMenu.setup()
statusBarHover.setup()
zoom.setup()

// export privileged APIs
// =

// builtin pages
if (window.location.protocol == 'beaker:') {
  window.beaker = {
    version: BEAKER_VERSION,
    bookmarks: bookmarks,
    fs: fs.getSandboxAPI(),
    history: history
  }
}

// p2p apps
if (window.location.protocol == 'dat:') {
  window.beaker = {
    version: BEAKER_VERSION,
    fs: fs.getSandboxAPI()
  }
}