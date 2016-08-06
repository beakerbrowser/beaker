import * as commandHandlers from './webview-preload/command-handlers'
import * as statusBarHover from './webview-preload/status-bar-hover'
import * as zoom from './webview-preload/zoom'
import importWebAPIs from './lib/fg/import-web-apis'

// setup UI
importWebAPIs()
commandHandlers.setup()
statusBarHover.setup()
zoom.setup()