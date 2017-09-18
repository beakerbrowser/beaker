import {ipcMain} from 'electron'
import rpc from 'pauls-electron-rpc'
import {internalOnly, secureOnly} from '../lib/bg/rpc'

// internal manifests
import beakerBrowserManifest from '../lib/api-manifests/internal/browser'
import downloadsManifest from '../lib/api-manifests/internal/downloads'
import sitedataManifest from '../lib/api-manifests/internal/sitedata'
import profilesManifest from '../lib/api-manifests/internal/profiles'
import timelineManifest from '../lib/api-manifests/internal/timeline'
import archivesManifest from '../lib/api-manifests/internal/archives'
import bookmarksManifest from '../lib/api-manifests/internal/bookmarks'
import historyManifest from '../lib/api-manifests/internal/history'
import appsManifest from '../lib/api-manifests/internal/apps'

// internal apis
import profilesAPI from './web-apis/profiles'
import timelineAPI from './web-apis/timeline'
import archivesAPI from './web-apis/archives'
import bookmarksAPI from './web-apis/bookmarks'
import historyAPI from './web-apis/history'
import appsAPI from './web-apis/apps'
import {WEBAPI as sitedataAPI} from './dbs/sitedata'
import {WEBAPI as downloadsAPI} from './ui/downloads'
import {WEBAPI as beakerBrowserAPI} from './browser'

// external manifests
import datArchiveManifest from '../lib/api-manifests/external/dat-archive'

// external apis
import datArchiveAPI from './web-apis/dat-archive'

// exported api
// =

export function setup () {
  // internal apis
  rpc.exportAPI('profiles', profilesManifest, profilesAPI, internalOnly)
  rpc.exportAPI('timeline', timelineManifest, timelineAPI, internalOnly)
  rpc.exportAPI('archives', archivesManifest, archivesAPI, internalOnly)
  rpc.exportAPI('bookmarks', bookmarksManifest, bookmarksAPI, internalOnly)
  rpc.exportAPI('history', historyManifest, historyAPI, internalOnly)
  rpc.exportAPI('apps', appsManifest, appsAPI, internalOnly)
  rpc.exportAPI('sitedata', sitedataManifest, sitedataAPI, internalOnly)
  rpc.exportAPI('downloads', downloadsManifest, downloadsAPI, internalOnly)
  rpc.exportAPI('beaker-browser', beakerBrowserManifest, beakerBrowserAPI, internalOnly)

  // external apis
  rpc.exportAPI('dat-archive', datArchiveManifest, datArchiveAPI, secureOnly)
}
