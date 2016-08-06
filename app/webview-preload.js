import * as statusBarHover from './webview-preload/status-bar-hover'
import importWebAPIs from './lib/fg/import-web-apis'

// setup UI
importWebAPIs()
statusBarHover.setup()