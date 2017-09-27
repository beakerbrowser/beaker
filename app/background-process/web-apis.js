import {ipcMain} from 'electron'
import rpc from 'pauls-electron-rpc'
import {internalOnly, secureOnly} from '../lib/bg/rpc'

// internal manifests
import beakerBrowserManifest from '../lib/api-manifests/internal/browser'
import downloadsManifest from '../lib/api-manifests/internal/downloads'
import sitedataManifest from '../lib/api-manifests/internal/sitedata'
import archivesManifest from '../lib/api-manifests/internal/archives'
import historyManifest from '../lib/api-manifests/internal/history'
import appsManifest from '../lib/api-manifests/internal/apps'

// internal apis
import archivesAPI from './web-apis/archives'
import historyAPI from './web-apis/history'
import appsAPI from './web-apis/apps'
import {WEBAPI as sitedataAPI} from './dbs/sitedata'
import {WEBAPI as downloadsAPI} from './ui/downloads'
import {WEBAPI as beakerBrowserAPI} from './browser'

// external manifests
import datArchiveManifest from '../lib/api-manifests/external/dat-archive'
import bookmarksManifest from '../lib/api-manifests/external/bookmarks'
import profilesManifest from '../lib/api-manifests/external/profiles'
import timelineManifest from '../lib/api-manifests/external/timeline'

// external apis
import datArchiveAPI from './web-apis/dat-archive'
import bookmarksAPI from './web-apis/bookmarks'
import profilesAPI from './web-apis/profiles'
import timelineAPI from './web-apis/timeline'

// exported api
// =

export function setup () {
  // internal apis
  rpc.exportAPI('archives', archivesManifest, archivesAPI, internalOnly)
  rpc.exportAPI('history', historyManifest, historyAPI, internalOnly)
  rpc.exportAPI('apps', appsManifest, appsAPI, internalOnly)
  rpc.exportAPI('sitedata', sitedataManifest, sitedataAPI, internalOnly)
  rpc.exportAPI('downloads', downloadsManifest, downloadsAPI, internalOnly)
  rpc.exportAPI('beaker-browser', beakerBrowserManifest, beakerBrowserAPI, internalOnly)

  // external apis
  rpc.exportAPI('dat-archive', datArchiveManifest, datArchiveAPI, secureOnly)
  rpc.exportAPI('bookmarks', bookmarksManifest, bookmarksAPI, secureOnly)
  rpc.exportAPI('profiles', profilesManifest, profilesAPI, secureOnly)
  rpc.exportAPI('timeline', timelineManifest, timelineAPI, secureOnly)
}
