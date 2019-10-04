import globals from '../globals'

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
  globals.rpcAPI.exportAPI('logger', loggerManifest, loggerAPI, internalOnly)
  globals.rpcAPI.exportAPI('archives', archivesManifest, archivesAPI, internalOnly)
  globals.rpcAPI.exportAPI('beaker-browser', beakerBrowserManifest, globals.browserWebAPI, internalOnly)
  globals.rpcAPI.exportAPI('downloads', downloadsManifest, globals.downloadsWebAPI, internalOnly)
  globals.rpcAPI.exportAPI('history', historyManifest, historyAPI, internalOnly)
  globals.rpcAPI.exportAPI('sitedata', sitedataManifest, sitedataAPI, internalOnly)
  globals.rpcAPI.exportAPI('watchlist', watchlistManifest, watchlistAPI, internalOnly)
  globals.rpcAPI.exportAPI('crawler', crawlerManifest, crawlerAPI, internalOnly)
  globals.rpcAPI.exportAPI('users', usersManifest, usersAPI, internalOnly)
  globals.rpcAPI.exportAPI('search', searchManifest, searchAPI, internalOnly)

  // external apis
  globals.rpcAPI.exportAPI('navigator', navigatorManifest, navigatorAPI, secureOnly)
  globals.rpcAPI.exportAPI('navigator-session', navigatorSessionManifest, navigatorSessionAPI, secureOnly)
  globals.rpcAPI.exportAPI('navigator-filesystem', navigatorFilesystemManifest, navigatorFilesystemAPI, secureOnly)
  globals.rpcAPI.exportAPI('dat-archive', datArchiveManifest, datArchiveAPI, secureOnly)
  globals.rpcAPI.exportAPI('spell-checker', spellCheckerManifest, spellCheckerAPI)
  globals.rpcAPI.exportAPI('unwalled-garden-bookmarks', bookmarksManifest, bookmarksAPI, secureOnly)
  globals.rpcAPI.exportAPI('unwalled-garden-comments', commentsManifest, commentsAPI, secureOnly)
  globals.rpcAPI.exportAPI('unwalled-garden-follows', followsManifest, followsAPI, secureOnly)
  globals.rpcAPI.exportAPI('unwalled-garden-library', libraryManifest, libraryAPI, secureOnly)
  globals.rpcAPI.exportAPI('unwalled-garden-statuses', statusesManifest, statusesAPI, secureOnly)
  globals.rpcAPI.exportAPI('unwalled-garden-profiles', profilesManifest, profilesAPI, secureOnly)
  globals.rpcAPI.exportAPI('unwalled-garden-reactions', reactionsManifest, reactionsAPI, secureOnly)
  globals.rpcAPI.exportAPI('unwalled-garden-tags', tagsManifest, tagsAPI, secureOnly)
  globals.rpcAPI.exportAPI('unwalled-garden-votes', votesManifest, votesAPI, secureOnly)

  // experimental apis
  globals.rpcAPI.exportAPI('experimental-capture-page', experimentalCapturePageManifest, experimentalCapturePageAPI, secureOnly)
  globals.rpcAPI.exportAPI('experimental-dat-peers', experimentalDatPeersManifest, experimentalDatPeersAPI, secureOnly)
  globals.rpcAPI.exportAPI('experimental-global-fetch', experimentalGlobalFetchManifest, experimentalGlobalFetchAPI, secureOnly)
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
