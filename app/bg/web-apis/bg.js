import { BrowserView } from 'electron'
import * as rpc from 'pauls-electron-rpc'
import { findTab } from '../ui/tab-manager'

const INTERNAL_ORIGIN_REGEX = /^(beaker:)/i
const SECURE_ORIGIN_REGEX = /^(beaker:|dat:|https:|http:\/\/localhost(\/|:))/i

// internal manifests
import loggerManifest from './manifests/internal/logger'
import archivesManifest from './manifests/internal/archives'
import beakerBrowserManifest from './manifests/internal/browser'
import bookmarksManifest from './manifests/internal/bookmarks'
import downloadsManifest from './manifests/internal/downloads'
import historyManifest from './manifests/internal/history'
import sitedataManifest from './manifests/internal/sitedata'
import watchlistManifest from './manifests/internal/watchlist'
import usersManifest from './manifests/internal/users'
import programsManifest from './manifests/internal/programs'
import typesManifest from './manifests/internal/types'

// internal apis
import { WEBAPI as loggerAPI } from '../logger'
import * as auditLog from '../dbs/audit-log'
import archivesAPI from './bg/archives'
import * as bookmarksAPI from '../filesystem/bookmarks'
import historyAPI from './bg/history'
import { WEBAPI as sitedataAPI } from '../dbs/sitedata'
import watchlistAPI from './bg/watchlist'
import { WEBAPI as downloadsAPI } from '../ui/downloads'
import { WEBAPI as beakerBrowserAPI } from '../browser'
import usersAPI from './bg/users'
import { WEBAPI as programsAPI } from '../filesystem/program-registry'
import { WEBAPI as typesAPI } from '../filesystem/type-registry'

// external manifests
import navigatorManifest from './manifests/external/navigator'
import navigatorSessionManifest from './manifests/external/navigator-session'
import navigatorFilesystemManifest from './manifests/external/navigator-filesystem'
import datArchiveManifest from './manifests/external/dat-archive'
import spellCheckerManifest from './manifests/external/spell-checker'

// external apis
import navigatorAPI from './bg/navigator'
import navigatorSessionAPI from './bg/navigator-session'
import navigatorFilesystemAPI from './bg/navigator-filesystem'
import datArchiveAPI from './bg/dat-archive'
import * as spellCheckerAPI from './bg/spell-checker'

// experimental manifests
import experimentalCapturePageManifest from './manifests/external/experimental/capture-page'
import experimentalDatPeersManifest from './manifests/external/experimental/dat-peers'
import experimentalGlobalFetchManifest from './manifests/external/experimental/global-fetch'

// experimental apis
import experimentalCapturePageAPI from './bg/experimental/capture-page'
import experimentalDatPeersAPI from './bg/experimental/dat-peers'
import experimentalGlobalFetchAPI from './bg/experimental/global-fetch'

// exported api
// =

export const setup = function () {
  // internal apis
  rpc.exportAPI('logger', loggerManifest, Object.assign({}, {listAuditLog: auditLog.list}, loggerAPI), internalOnly)
  rpc.exportAPI('archives', archivesManifest, archivesAPI, internalOnly)
  rpc.exportAPI('beaker-browser', beakerBrowserManifest, beakerBrowserAPI, internalOnly)
  rpc.exportAPI('bookmarks', bookmarksManifest, bookmarksAPI, internalOnly)
  rpc.exportAPI('downloads', downloadsManifest, downloadsAPI, internalOnly)
  rpc.exportAPI('history', historyManifest, historyAPI, internalOnly)
  rpc.exportAPI('sitedata', sitedataManifest, sitedataAPI, internalOnly)
  rpc.exportAPI('watchlist', watchlistManifest, watchlistAPI, internalOnly)
  rpc.exportAPI('users', usersManifest, usersAPI, internalOnly)
  rpc.exportAPI('programs', programsManifest, programsAPI, internalOnly)
  rpc.exportAPI('types', typesManifest, typesAPI, internalOnly)

  // external apis
  rpc.exportAPI('navigator', navigatorManifest, navigatorAPI, secureOnly)
  rpc.exportAPI('navigator-session', navigatorSessionManifest, navigatorSessionAPI, secureOnly)
  rpc.exportAPI('navigator-filesystem', navigatorFilesystemManifest, navigatorFilesystemAPI, secureOnly)
  rpc.exportAPI('dat-archive', datArchiveManifest, datArchiveAPI, secureOnly)
  // rpc.exportAPI('spell-checker', spellCheckerManifest, spellCheckerAPI) TODO

  // experimental apis
  rpc.exportAPI('experimental-capture-page', experimentalCapturePageManifest, experimentalCapturePageAPI, secureOnly)
  rpc.exportAPI('experimental-dat-peers', experimentalDatPeersManifest, experimentalDatPeersAPI, secureOnly)
  rpc.exportAPI('experimental-global-fetch', experimentalGlobalFetchManifest, experimentalGlobalFetchAPI, secureOnly)
}

function internalOnly (event, methodName, args) {
  return (event && event.sender && INTERNAL_ORIGIN_REGEX.test(getUrl(event.sender)))
}

function secureOnly (event, methodName, args) {
  if (!(event && event.sender)) {
    return false
  }
  return SECURE_ORIGIN_REGEX.test(getUrl(event.sender))
}

function getUrl (sender) {
  var url = sender.getURL()
  if (!url || sender.isLoadingMainFrame()) {
    let view = BrowserView.fromWebContents(sender)
    let tab = findTab(view)
    if (tab) {
      url = tab.loadingURL || url
    }
  }
  return url
}