import { ipcMain } from 'electron'
import rpc from 'pauls-electron-rpc'
import beakerBrowser from '../lib/api-manifests/internal/browser'
import beakerBookmarks from '../lib/api-manifests/internal/bookmarks'
import beakerDownloads from '../lib/api-manifests/internal/downloads'
import beakerHistory from '../lib/api-manifests/internal/history'
import beakerSitedata from '../lib/api-manifests/internal/sitedata'

import libraryManifest from '../lib/api-manifests/external/library'
import datArchiveManifest from '../lib/api-manifests/external/dat-archive'
import appsManifest from '../lib/api-manifests/external/apps'

import libraryAPI from './web-apis/library'
import datArchiveAPI from './web-apis/dat-archive'
import appsAPI from './web-apis/apps'

// exported api
// =

export function setup () {

  // wire up RPC
  rpc.exportAPI('library', libraryManifest, libraryAPI)
  rpc.exportAPI('dat-archive', datArchiveManifest, datArchiveAPI)
  rpc.exportAPI('apps', appsManifest, appsAPI)

  // register a message-handler for setting up the client
  // - see lib/fg/import-web-apis.js
  // TODO remove this
  ipcMain.on('get-web-api-manifests', (event, scheme) => {
    var protos

    // hardcode the beaker: scheme, since that's purely for internal use
    if (scheme === 'beaker:') {
      protos = {
        beakerBrowser,
        beakerBookmarks,
        beakerDownloads,
        beakerHistory,
        beakerSitedata
      }
      event.returnValue = protos
      return
    }

    event.returnValue = {}
  })
}
