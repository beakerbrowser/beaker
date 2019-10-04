import * as rpc from 'pauls-electron-rpc'

const SECURE_ORIGIN_REGEX = /^(beaker:|dat:|https:|http:\/\/localhost(\/|:))/i

// internal manifests
import loggerManifest from './manifests/internal/logger'
import archivesManifest from './manifests/internal/archives'
import beakerBrowserManifest from './manifests/internal/browser'
import downloadsManifest from './manifests/internal/downloads'
import historyManifest from './manifests/internal/history'
import sitedataManifest from './manifests/internal/sitedata'
import watchlistManifest from './manifests/internal/watchlist'
import crawlerManifest from './manifests/internal/crawler'
import usersManifest from './manifests/internal/users'
import searchManifest from './manifests/internal/search'

// internal apis
import { WEBAPI as loggerAPI } from '../logger'
import archivesAPI from './bg/archives'
import historyAPI from './bg/history'
import { WEBAPI as sitedataAPI } from '../dbs/sitedata'
import watchlistAPI from './bg/watchlist'
import { WEBAPI as downloadsAPI } from '../ui/downloads'
import { WEBAPI as beakerBrowserAPI } from '../browser'
import { WEBAPI as crawlerAPI } from '../uwg/index'
import usersAPI from './bg/users'
import searchAPI from './bg/search'

// external manifests
import navigatorManifest from './manifests/external/navigator'
import navigatorSessionManifest from './manifests/external/navigator-session'
import navigatorFilesystemManifest from './manifests/external/navigator-filesystem'
import datArchiveManifest from './manifests/external/dat-archive'
import spellCheckerManifest from './manifests/external/spell-checker'
import bookmarksManifest from './manifests/external/unwalled-garden-bookmarks'
import commentsManifest from './manifests/external/unwalled-garden-comments'
import followsManifest from './manifests/external/unwalled-garden-follows'
import libraryManifest from './manifests/external/unwalled-garden-library'
import statusesManifest from './manifests/external/unwalled-garden-statuses'
import profilesManifest from './manifests/external/unwalled-garden-profiles'
import reactionsManifest from './manifests/external/unwalled-garden-reactions'
import tagsManifest from './manifests/external/unwalled-garden-tags'
import votesManifest from './manifests/external/unwalled-garden-votes'

// external apis
import navigatorAPI from './bg/navigator'
import navigatorSessionAPI from './bg/navigator-session'
import navigatorFilesystemAPI from './bg/navigator-filesystem'
import datArchiveAPI from './bg/dat-archive'
import * as spellCheckerAPI from './bg/spell-checker'
import bookmarksAPI from './bg/unwalled-garden-bookmarks'
import commentsAPI from './bg/unwalled-garden-comments'
import followsAPI from './bg/unwalled-garden-follows'
import libraryAPI from './bg/unwalled-garden-library'
import statusesAPI from './bg/unwalled-garden-statuses'
import profilesAPI from './bg/unwalled-garden-profiles'
import reactionsAPI from './bg/unwalled-garden-reactions'
import tagsAPI from './bg/unwalled-garden-tags'
import votesAPI from './bg/unwalled-garden-votes'

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
  rpc.exportAPI('logger', loggerManifest, loggerAPI, internalOnly)
  rpc.exportAPI('archives', archivesManifest, archivesAPI, internalOnly)
  rpc.exportAPI('beaker-browser', beakerBrowserManifest, beakerBrowserAPI, internalOnly)
  rpc.exportAPI('downloads', downloadsManifest, downloadsAPI, internalOnly)
  rpc.exportAPI('history', historyManifest, historyAPI, internalOnly)
  rpc.exportAPI('sitedata', sitedataManifest, sitedataAPI, internalOnly)
  rpc.exportAPI('watchlist', watchlistManifest, watchlistAPI, internalOnly)
  rpc.exportAPI('crawler', crawlerManifest, crawlerAPI, internalOnly)
  rpc.exportAPI('users', usersManifest, usersAPI, internalOnly)
  rpc.exportAPI('search', searchManifest, searchAPI, internalOnly)

  // external apis
  rpc.exportAPI('navigator', navigatorManifest, navigatorAPI, secureOnly)
  rpc.exportAPI('navigator-session', navigatorSessionManifest, navigatorSessionAPI, secureOnly)
  rpc.exportAPI('navigator-filesystem', navigatorFilesystemManifest, navigatorFilesystemAPI, secureOnly)
  rpc.exportAPI('dat-archive', datArchiveManifest, datArchiveAPI, secureOnly)
  rpc.exportAPI('spell-checker', spellCheckerManifest, spellCheckerAPI)
  rpc.exportAPI('unwalled-garden-bookmarks', bookmarksManifest, bookmarksAPI, secureOnly)
  rpc.exportAPI('unwalled-garden-comments', commentsManifest, commentsAPI, secureOnly)
  rpc.exportAPI('unwalled-garden-follows', followsManifest, followsAPI, secureOnly)
  rpc.exportAPI('unwalled-garden-library', libraryManifest, libraryAPI, secureOnly)
  rpc.exportAPI('unwalled-garden-statuses', statusesManifest, statusesAPI, secureOnly)
  rpc.exportAPI('unwalled-garden-profiles', profilesManifest, profilesAPI, secureOnly)
  rpc.exportAPI('unwalled-garden-reactions', reactionsManifest, reactionsAPI, secureOnly)
  rpc.exportAPI('unwalled-garden-tags', tagsManifest, tagsAPI, secureOnly)
  rpc.exportAPI('unwalled-garden-votes', votesManifest, votesAPI, secureOnly)

  // experimental apis
  rpc.exportAPI('experimental-capture-page', experimentalCapturePageManifest, experimentalCapturePageAPI, secureOnly)
  rpc.exportAPI('experimental-dat-peers', experimentalDatPeersManifest, experimentalDatPeersAPI, secureOnly)
  rpc.exportAPI('experimental-global-fetch', experimentalGlobalFetchManifest, experimentalGlobalFetchAPI, secureOnly)
}

function internalOnly (event, methodName, args) {
  return (event && event.sender && event.sender.getURL().startsWith('beaker:'))
}

function secureOnly (event, methodName, args) {
  if (!(event && event.sender)) {
    return false
  }
  var url = event.sender.getURL()
  return SECURE_ORIGIN_REGEX.test(url)
}
