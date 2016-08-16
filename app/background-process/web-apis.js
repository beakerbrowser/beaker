import { ipcMain } from 'electron'
import beakerBrowser from './api-manifests/browser'
import beakerBookmarks from './api-manifests/bookmarks'
import beakerDownloads from './api-manifests/downloads'
import beakerHistory from './api-manifests/history'
import beakerSitedata from './api-manifests/sitedata'
import * as beakerBrowserAPI from './browser'

// exported api
// =

export function setup () {
  // register a message-handler for setting up the client
  // - see lib/fg/import-web-apis.js
  ipcMain.on('get-web-api-manifests', (event, scheme) => {
    // hardcode the beaker: scheme, since that's purely for internal use
    if (scheme == 'beaker:') {
      event.returnValue = { 
        beakerBrowser,
        beakerBookmarks,
        beakerDownloads,
        beakerHistory,
        beakerSitedata
      }
      return
    }

    // for everything else, we'll use the plugins
    event.returnValue = beakerBrowserAPI.getWebAPIManifests(scheme)
  })
}