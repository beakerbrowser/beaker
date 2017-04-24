import {ipcMain} from 'electron'
import rpc from 'pauls-electron-rpc'
import {internalOnly} from '../lib/bg/rpc'

// internal manifests
import beakerBrowser from '../lib/api-manifests/internal/browser'
import beakerDownloads from '../lib/api-manifests/internal/downloads'
import beakerSitedata from '../lib/api-manifests/internal/sitedata'
import profilesManifest from '../lib/api-manifests/internal/profiles'

// internal apis
import profilesAPI from './web-apis/profiles'

// external manifests
import archivesManifest from '../lib/api-manifests/external/archives'
import datArchiveManifest from '../lib/api-manifests/external/dat-archive'
import bookmarksManifest from '../lib/api-manifests/external/bookmarks'
import historyManifest from '../lib/api-manifests/external/history'

// external apis
import archivesAPI from './web-apis/archives'
import datArchiveAPI from './web-apis/dat-archive'
import bookmarksAPI from './web-apis/bookmarks'
import historyAPI from './web-apis/history'

// exported api
// =

export function setup () {

  // internal apis
  rpc.exportAPI('profiles', profilesManifest, profilesAPI, internalOnly)

  // external apis
  rpc.exportAPI('archives', archivesManifest, archivesAPI)
  rpc.exportAPI('dat-archive', datArchiveManifest, datArchiveAPI)
  rpc.exportAPI('bookmarks', bookmarksManifest, bookmarksAPI)
  rpc.exportAPI('history', historyManifest, historyAPI)

  // register a message-handler for setting up the client
  // - see lib/fg/import-web-apis.js
  // TODO remove this
  ipcMain.on('get-web-api-manifests', (event, scheme) => {
    var protos

    // hardcode the beaker: scheme, since that's purely for internal use
    if (scheme === 'beaker:') {
      protos = {
        beakerBrowser,
        beakerDownloads,
        beakerSitedata
      }
      event.returnValue = protos
      return
    }

    event.returnValue = {}
  })
}
