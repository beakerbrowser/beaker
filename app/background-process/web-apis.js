import { ipcMain } from 'electron'
import beakerBrowser from './api-manifests/browser'
import beakerBookmarks from './api-manifests/bookmarks'
import beakerDownloads from './api-manifests/downloads'
import beakerHistory from './api-manifests/history'
import beakerSitedata from './api-manifests/sitedata'
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
    // hardcode the beaker: scheme, since that's purely for internal use
    if (scheme == 'beaker:') {
      var protos = { 
        beakerBrowser,
        beakerBookmarks,
        beakerDownloads,
        beakerHistory,
        beakerSitedata
      }
      if (datPlugin && datPlugin.webAPIs[0])
        protos.datInternalAPI = datPlugin.webAPIs[0].manifest
      event.returnValue = protos
      return
    }

    // for everything else, we'll use the plugins
    event.returnValue = plugins.getWebAPIManifests(scheme)
  })
}