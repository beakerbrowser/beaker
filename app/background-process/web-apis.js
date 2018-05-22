import rpc from 'pauls-electron-rpc'
import {internalOnly, secureOnly} from '../lib/bg/rpc'

// internal manifests
import beakerBrowserManifest from '../lib/api-manifests/internal/browser'
import bookmarksManifest from '../lib/api-manifests/internal/bookmarks'
import downloadsManifest from '../lib/api-manifests/internal/downloads'
import sitedataManifest from '../lib/api-manifests/internal/sitedata'
import archivesManifest from '../lib/api-manifests/internal/archives'
import historyManifest from '../lib/api-manifests/internal/history'
import servicesManifest from '../lib/api-manifests/internal/services'
// import appsManifest from '../lib/api-manifests/internal/apps'

// internal apis
import archivesAPI from './web-apis/archives'
import bookmarksAPI from './web-apis/bookmarks'
import historyAPI from './web-apis/history'
import servicesAPI from './web-apis/services'
// import appsAPI from './web-apis/apps'
import {WEBAPI as sitedataAPI} from './dbs/sitedata'
import {WEBAPI as downloadsAPI} from './ui/downloads'
import {WEBAPI as beakerBrowserAPI} from './browser'

// external manifests
import datArchiveManifest from '../lib/api-manifests/external/dat-archive'
// import userSessionManifest from '../lib/api-manifests/external/user-session'
// import profilesManifest from '../lib/api-manifests/external/profiles'

// external apis
import datArchiveAPI from './web-apis/dat-archive'
// import userSessionAPI from './web-apis/user-session'
// import profilesAPI from './web-apis/profiles'


// experimental manifests
import experimentalLibraryManifest from '../lib/api-manifests/external/experimental/library'

// experimental apis
import experimentalLibraryAPI from './web-apis/experimental/library'

// exported api
// =

export function setup () {
  // internal apis
  rpc.exportAPI('archives', archivesManifest, archivesAPI, internalOnly)
  rpc.exportAPI('bookmarks', bookmarksManifest, bookmarksAPI, internalOnly)
  rpc.exportAPI('history', historyManifest, historyAPI, internalOnly)
  // rpc.exportAPI('apps', appsManifest, appsAPI, internalOnly)
  rpc.exportAPI('sitedata', sitedataManifest, sitedataAPI, internalOnly)
  rpc.exportAPI('downloads', downloadsManifest, downloadsAPI, internalOnly)
  rpc.exportAPI('services', servicesManifest, servicesAPI, internalOnly)
  rpc.exportAPI('beaker-browser', beakerBrowserManifest, beakerBrowserAPI, internalOnly)

  // external apis
  rpc.exportAPI('dat-archive', datArchiveManifest, datArchiveAPI, secureOnly)
  // rpc.exportAPI('user-session', userSessionManifest, userSessionAPI, secureOnly)
  // rpc.exportAPI('profiles', profilesManifest, profilesAPI, secureOnly)

  // experimental apis
  rpc.exportAPI('experimental-library', experimentalLibraryManifest, experimentalLibraryAPI, secureOnly)
}
