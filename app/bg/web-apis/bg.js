import { BrowserView } from 'electron'
import * as rpc from 'pauls-electron-rpc'
import { findTab } from '../ui/tabs/manager'

// TEMPORARY: hyperdrive.network is trusted
const INTERNAL_ORIGIN_REGEX = /^(beaker:|https?:\/\/(.*\.)?hyperdrive\.network(:|\/))/i
const SITE_ORIGIN_REGEX = /^(beaker:|hyper:|https?:|data:)/i
const IFRAME_WHITELIST = [
  'hyperdrive.loadDrive',
  'hyperdrive.getInfo',
  'hyperdrive.diff',
  'hyperdrive.stat',
  'hyperdrive.readFile',
  'hyperdrive.readdir',
  'hyperdrive.query',
  'hyperdrive.watch',
  'hyperdrive.resolveName'
]

// internal manifests
import loggerManifest from './manifests/internal/logger'
import drivesManifest from './manifests/internal/drives'
import beakerBrowserManifest from './manifests/internal/browser'
import beakerFilesystemManifest from './manifests/internal/beaker-filesystem'
import bookmarksManifest from './manifests/internal/bookmarks'
import datLegacyManifest from './manifests/internal/dat-legacy'
import downloadsManifest from './manifests/internal/downloads'
import folderSyncManifest from './manifests/internal/folder-sync'
import historyManifest from './manifests/internal/history'
import sitedataManifest from './manifests/internal/sitedata'
import watchlistManifest from './manifests/internal/watchlist'

// internal apis
import { WEBAPI as loggerAPI } from '../logger'
import { WEBAPI as auditLogAPI } from '../dbs/audit-log'
import drivesAPI from './bg/drives'
import * as bookmarksAPI from '../filesystem/bookmarks'
import beakerFilesystemAPI from './bg/beaker-filesystem'
import datLegacyAPI from './bg/dat-legacy'
import folderSyncAPI from './bg/folder-sync'
import historyAPI from './bg/history'
import { WEBAPI as sitedataAPI } from '../dbs/sitedata'
import watchlistAPI from './bg/watchlist'
import { WEBAPI as downloadsAPI } from '../ui/downloads'
import { WEBAPI as beakerBrowserAPI } from '../browser'

// external manifests
import capabilitiesManifest from './manifests/external/capabilities'
import contactsManifest from './manifests/external/contacts'
import hyperdriveManifest from './manifests/external/hyperdrive'
import markdownManifest from './manifests/external/markdown'
import panesManifest from './manifests/external/panes'
import peersocketsManifest from './manifests/external/peersockets'
import shellManifest from './manifests/external/shell'

// external apis
import capabilitiesAPI from './bg/capabilities'
import contactsAPI from './bg/contacts'
import hyperdriveAPI from './bg/hyperdrive'
import markdownAPI from './bg/markdown'
import panesAPI from './bg/panes'
import peersocketsAPI from './bg/peersockets'
import shellAPI from './bg/shell'

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
  rpc.exportAPI('logger', loggerManifest, Object.assign({}, auditLogAPI, loggerAPI), internalOnly)
  rpc.exportAPI('beaker-browser', beakerBrowserManifest, beakerBrowserAPI, internalOnly)
  rpc.exportAPI('beaker-filesystem', beakerFilesystemManifest, beakerFilesystemAPI, internalOnly)
  rpc.exportAPI('bookmarks', bookmarksManifest, bookmarksAPI, internalOnly)
  rpc.exportAPI('dat-legacy', datLegacyManifest, datLegacyAPI, internalOnly)
  rpc.exportAPI('downloads', downloadsManifest, downloadsAPI, internalOnly)
  rpc.exportAPI('drives', drivesManifest, drivesAPI, internalOnly)
  rpc.exportAPI('folder-sync', folderSyncManifest, folderSyncAPI, internalOnly)
  rpc.exportAPI('history', historyManifest, historyAPI, internalOnly)
  rpc.exportAPI('sitedata', sitedataManifest, sitedataAPI, internalOnly)
  rpc.exportAPI('watchlist', watchlistManifest, watchlistAPI, internalOnly)

  // external apis
  rpc.exportAPI('capabilities', capabilitiesManifest, capabilitiesAPI, secureOnly('capabilities'))
  rpc.exportAPI('contacts', contactsManifest, contactsAPI, secureOnly('contacts'))
  rpc.exportAPI('hyperdrive', hyperdriveManifest, hyperdriveAPI, secureOnly('hyperdrive'))
  rpc.exportAPI('markdown', markdownManifest, markdownAPI)
  rpc.exportAPI('panes', panesManifest, panesAPI, secureOnly('panes'))
  rpc.exportAPI('peersockets', peersocketsManifest, peersocketsAPI, secureOnly('peersockets'))
  rpc.exportAPI('shell', shellManifest, shellAPI, secureOnly('shell'))

  // experimental apis
  rpc.exportAPI('experimental-capture-page', experimentalCapturePageManifest, experimentalCapturePageAPI, secureOnly)
  rpc.exportAPI('experimental-dat-peers', experimentalDatPeersManifest, experimentalDatPeersAPI, secureOnly)
  rpc.exportAPI('experimental-global-fetch', experimentalGlobalFetchManifest, experimentalGlobalFetchAPI, secureOnly)
}

function internalOnly (event, methodName, args) {
  if (!(event && event.sender)) {
    return false
  }
  var senderInfo = getSenderInfo(event)
  return senderInfo.isMainFrame && INTERNAL_ORIGIN_REGEX.test(senderInfo.url)
}

const secureOnly = apiName => (event, methodName, args) => {
  if (!(event && event.sender)) {
    return false
  }
  var senderInfo = getSenderInfo(event)
  if (!SITE_ORIGIN_REGEX.test(senderInfo.url)) {
    return false
  }
  if (!senderInfo.isMainFrame) {
    return IFRAME_WHITELIST.includes(`${apiName}.${methodName}`)
  }
  return true
}

function getSenderInfo (event) {
  var view = BrowserView.fromWebContents(event.sender)
  var tab = (view) ? findTab(view) : undefined
  if (tab) return tab.getIPCSenderInfo(event)
  return {isMainFrame: true, url: event.sender.getURL()}
}