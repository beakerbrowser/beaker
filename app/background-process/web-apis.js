import {ipcMain} from 'electron'
import rpc from 'pauls-electron-rpc'
import {internalOnly, secureOnly, datOnly} from '../lib/bg/rpc'

// internal manifests
import beakerBrowser from '../lib/api-manifests/internal/browser'
import beakerDownloads from '../lib/api-manifests/internal/downloads'
import beakerSitedata from '../lib/api-manifests/internal/sitedata'
import profilesManifest from '../lib/api-manifests/internal/profiles'
import archivesManifest from '../lib/api-manifests/internal/archives'
import bookmarksManifest from '../lib/api-manifests/internal/bookmarks'
import historyManifest from '../lib/api-manifests/internal/history'

// internal apis
import profilesAPI from './web-apis/profiles'
import archivesAPI from './web-apis/archives'
import bookmarksAPI from './web-apis/bookmarks'
import historyAPI from './web-apis/history'

// external manifests
import datArchiveManifest from '../lib/api-manifests/external/dat-archive'
import userSessionManifest from '../lib/api-manifests/external/user-session'

// external apis
import datArchiveAPI from './web-apis/dat-archive'
import userSessionAPI from './web-apis/user-session'

// exported api
// =

export function setup () {

  // internal apis
  rpc.exportAPI('profiles', profilesManifest, profilesAPI, internalOnly)
  rpc.exportAPI('archives', archivesManifest, archivesAPI, internalOnly)
  rpc.exportAPI('bookmarks', bookmarksManifest, bookmarksAPI, internalOnly)
  rpc.exportAPI('history', historyManifest, historyAPI, internalOnly)

  // external apis
  rpc.exportAPI('dat-archive', datArchiveManifest, datArchiveAPI, secureOnly)
  rpc.exportAPI('user-session', userSessionManifest, userSessionAPI, datOnly)

  // register a message-handler for setting up the client
  // - see lib/fg/import-web-apis.js
  // TODO replace this with manual exports
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
