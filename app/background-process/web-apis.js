import { ipcMain } from 'electron'
import beakerBookmarks from './api-manifests/bookmarks'
import beakerDownloads from './api-manifests/downloads'
import beakerHistory from './api-manifests/history'
import beakerSitedata from './api-manifests/sitedata'
import beakerPluginModules from './api-manifests/plugin-modules'
import * as pluginModules from './plugin-modules'

// exported api
// =

export function setup () {
  // register a message-handler for setting up the client
  // - see lib/fg/import-web-apis.js
  ipcMain.on('get-web-api-manifests', (event, scheme) => {
    // hardcode the beaker: scheme, since that's purely for internal use
    if (scheme == 'beaker:') {
      event.returnValue = { 
        beakerBookmarks,
        beakerDownloads,
        beakerHistory,
        beakerSitedata,
        beakerPluginModules
      }
      return
    }

    // for everything else, we'll use the plugins
    event.returnValue = pluginModules.getWebAPIManifests(scheme)
  })
}