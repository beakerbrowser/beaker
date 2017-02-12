import { ipcMain } from 'electron'
import beakerBrowser from './api-manifests/internal/browser'
import beakerBookmarks from './api-manifests/internal/bookmarks'
import beakerDownloads from './api-manifests/internal/downloads'
import beakerHistory from './api-manifests/internal/history'
import beakerSitedata from './api-manifests/internal/sitedata'
import datInternalAPI from './api-manifests/internal/dat-internal'
import dat from './api-manifests/external/dat'
import * as plugins from './plugins'

// dat-plugin is an optional internal dependency
var datPlugin
try {
  datPlugin = require('beaker-plugin-dat')
} catch (e){}

// exported api
// =

export function setup () {
  // register a message-handler for setting up the client
  // - see lib/fg/import-web-apis.js
  ipcMain.on('get-web-api-manifests', (event, scheme) => {
    var protos

    // hardcode the beaker: scheme, since that's purely for internal use
    if (scheme === 'beaker:') {
      protos = {
        beakerBrowser,
        beakerBookmarks,
        beakerDownloads,
        beakerHistory,
        beakerSitedata,
        datInternalAPI
      }
      event.returnValue = protos
      return
    }

    // for everything else, we'll use the plugins
    protos = plugins.getWebAPIManifests(scheme)

    // include dat api in dat:// sites
    if (scheme === 'dat:') {
      protos['dat'] = dat
    }

    event.returnValue = protos
  })
}
