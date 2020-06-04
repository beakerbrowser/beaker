import { EventTarget, bindEventStream, fromEventStream } from './event-target'
import errors from 'beaker-error-constants'
import loggerManifest from '../manifests/internal/logger'
import beakerBrowserManifest from '../manifests/internal/browser'
import bookmarksManifest from '../manifests/internal/bookmarks'
import datLegacyManifest from '../manifests/internal/dat-legacy'
import downloadsManifest from '../manifests/internal/downloads'
import drivesManifest from '../manifests/internal/drives'
import folderSyncManifest from '../manifests/internal/folder-sync'
import historyManifest from '../manifests/internal/history'
import sitedataManifest from '../manifests/internal/sitedata'
import watchlistManifest from '../manifests/internal/watchlist'

export const setup = function (rpc) {
  const internal = {}
  const opts = { timeout: false, errors }

  const loggerRPC = rpc.importAPI('logger', loggerManifest, opts)
  const beakerBrowserRPC = rpc.importAPI('beaker-browser', beakerBrowserManifest, opts)
  const bookmarksRPC = rpc.importAPI('bookmarks', bookmarksManifest, opts)
  const downloadsRPC = rpc.importAPI('downloads', downloadsManifest, opts)
  const drivesRPC = rpc.importAPI('drives', drivesManifest, opts)
  const datLegacyRPC = rpc.importAPI('dat-legacy', datLegacyManifest, opts)
  const folderSyncRPC = rpc.importAPI('folder-sync', folderSyncManifest, opts)
  const historyRPC = rpc.importAPI('history', historyManifest, opts)
  const sitedataRPC = rpc.importAPI('sitedata', sitedataManifest, opts)
  const watchlistRPC = rpc.importAPI('watchlist', watchlistManifest, opts)

  // attach APIs
  internal.browser = Object.assign({}, beakerBrowserRPC)
  internal.browser.createEventsStream = () => fromEventStream(beakerBrowserRPC.createEventsStream())
  internal.bookmarks = Object.assign({}, bookmarksRPC)
  internal.datLegacy = datLegacyRPC
  internal.downloads = Object.assign({}, downloadsRPC)
  internal.downloads.createEventsStream = () => fromEventStream(downloadsRPC.createEventsStream())
  internal.folderSync = Object.assign({}, folderSyncRPC)
  internal.history = Object.assign({}, historyRPC)
  internal.logger = Object.assign({}, loggerRPC)
  internal.logger.stream = (opts) => fromEventStream(loggerRPC.stream(opts))
  internal.logger.streamAuditLog = () => fromEventStream(loggerRPC.streamAuditLog())
  internal.sitedata = Object.assign({}, sitedataRPC)
  internal.watchlist = Object.assign({}, watchlistRPC)
  internal.watchlist.createEventsStream = () => fromEventStream(watchlistRPC.createEventsStream())
  
  // internal.drives
  internal.drives = new EventTarget()
  internal.drives.get = drivesRPC.get
  internal.drives.list = drivesRPC.list
  internal.drives.getPeerCount = drivesRPC.getPeerCount
  internal.drives.getForks = drivesRPC.getForks
  internal.drives.configure = drivesRPC.configure
  internal.drives.remove = drivesRPC.remove
  internal.drives.listTrash = drivesRPC.listTrash
  internal.drives.collectTrash = drivesRPC.collectTrash
  internal.drives.delete = drivesRPC.delete
  internal.drives.touch = drivesRPC.touch
  internal.drives.clearFileCache = drivesRPC.clearFileCache
  internal.drives.clearDnsCache = drivesRPC.clearDnsCache
  internal.drives.getDebugLog = drivesRPC.getDebugLog
  internal.drives.createDebugStream = () => fromEventStream(drivesRPC.createDebugStream())
  // window.addEventListener('load', () => {
  //   try {
  //     bindEventStream(drivesRPC.createEventStream(), internal.drives)
  //   } catch (e) {
  //     // permissions error
  //   }
  // })

  return internal
}
