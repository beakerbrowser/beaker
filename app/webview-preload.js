import importWebAPIs from './lib/fg/import-web-apis'
import babelBrowserBuild from 'browser-es-module-loader/dist/babel-browser-build'
import BrowserESModuleLoader from 'browser-es-module-loader/dist/browser-es-module-loader'

// setup UI
importWebAPIs()

// attach globals
window.BrowserESModuleLoader = BrowserESModuleLoader