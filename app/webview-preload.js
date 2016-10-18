import { webFrame } from 'electron'
import importWebAPIs from './lib/fg/import-web-apis'
import { setup as setupLocationbar } from './webview-preload/locationbar'
import babelBrowserBuild from 'browser-es-module-loader/dist/babel-browser-build'
import BrowserESModuleLoader from 'browser-es-module-loader/dist/browser-es-module-loader'

// register protocol behaviors
/* This marks the scheme as:
 - Secure
 - Allowing Service Workers
 - Supporting Fetch API
 - CORS Enabled
*/
webFrame.registerURLSchemeAsPrivileged('dat', { bypassCSP: false })

// setup APIs
importWebAPIs()
setupLocationbar()
window.BrowserESModuleLoader = BrowserESModuleLoader
