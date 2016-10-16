import { webFrame } from 'electron'
import importWebAPIs from './lib/fg/import-web-apis'
import { setup as setupLocationbar } from './webview-preload/locationbar'
import babelBrowserBuild from 'browser-es-module-loader/dist/babel-browser-build'
import BrowserESModuleLoader from 'browser-es-module-loader/dist/browser-es-module-loader'

// register protocol behaviors
webFrame.registerURLSchemeAsPrivileged('dat')
/* This marks the scheme as:
 - Secure
 - Bypassing CSP
 - Allowing Service Workers
 - Supporting Fetch API
 - CORS Enabled
TODO: we dont want to bypass CSP! that will need some electron fixes
see https://github.com/electron/electron/issues/7430
*/

// setup APIs
importWebAPIs()
setupLocationbar()
window.BrowserESModuleLoader = BrowserESModuleLoader
