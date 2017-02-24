import { webFrame } from 'electron'
import importWebAPIs from './lib/fg/import-web-apis' // TODO remove
import { setup as setupLocationbar } from './webview-preload/locationbar'
import { setup as setupNavigatorPermissions } from './webview-preload/navigator-permissions-api'

import DatArchive from './webview-preload/web-apis/dat-archive'

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
setupNavigatorPermissions()
window.DatArchive = DatArchive
