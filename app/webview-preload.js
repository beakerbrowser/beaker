import { webFrame } from 'electron'
import importWebAPIs from './lib/fg/import-web-apis'
import { setup as setupLocationbar } from './webview-preload/locationbar'
import { setup as setupDat } from './webview-preload/dat'
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
setupDat()
window.BrowserESModuleLoader = BrowserESModuleLoader
