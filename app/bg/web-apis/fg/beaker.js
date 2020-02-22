import { EventTarget, bindEventStream, fromEventStream } from './event-target'
import errors from 'beaker-error-constants'
import loggerManifest from '../manifests/internal/logger'
import beakerBrowserManifest from '../manifests/internal/browser'
import bookmarksManifest from '../manifests/internal/bookmarks'
import downloadsManifest from '../manifests/internal/downloads'
import drivesManifest from '../manifests/internal/drives'
import historyManifest from '../manifests/internal/history'
import sitedataManifest from '../manifests/internal/sitedata'
import watchlistManifest from '../manifests/internal/watchlist'
import usersManifest from '../manifests/internal/users'

export const setup = function (rpc) {
  const beaker = {}
  const opts = { timeout: false, errors }

  // internal only
  if (['beaker:'].includes(window.location.protocol)) {
    const loggerRPC = rpc.importAPI('logger', loggerManifest, opts)
    const beakerBrowserRPC = rpc.importAPI('beaker-browser', beakerBrowserManifest, opts)
    const bookmarksRPC = rpc.importAPI('bookmarks', bookmarksManifest, opts)
    const downloadsRPC = rpc.importAPI('downloads', downloadsManifest, opts)
    const drivesRPC = rpc.importAPI('drives', drivesManifest, opts)
    const historyRPC = rpc.importAPI('history', historyManifest, opts)
    const sitedataRPC = rpc.importAPI('sitedata', sitedataManifest, opts)
    const watchlistRPC = rpc.importAPI('watchlist', watchlistManifest, opts)
    const usersRPC = rpc.importAPI('users', usersManifest, opts)

    // attach APIs
    beaker.browser = Object.assign({}, beakerBrowserRPC)
    beaker.browser.createEventsStream = () => fromEventStream(beakerBrowserRPC.createEventsStream())
    beaker.bookmarks = Object.assign({}, bookmarksRPC)
    beaker.downloads = Object.assign({}, downloadsRPC)
    beaker.downloads.createEventsStream = () => fromEventStream(downloadsRPC.createEventsStream())
    beaker.history = Object.assign({}, historyRPC)
    beaker.logger = Object.assign({}, loggerRPC)
    beaker.logger.stream = (opts) => fromEventStream(loggerRPC.stream(opts))
    beaker.logger.streamAuditLog = () => fromEventStream(loggerRPC.streamAuditLog())
    beaker.sitedata = Object.assign({}, sitedataRPC)
    beaker.users = Object.assign({}, usersRPC)
    beaker.watchlist = Object.assign({}, watchlistRPC)
    beaker.watchlist.createEventsStream = () => fromEventStream(watchlistRPC.createEventsStream())
    
    // beaker.drives
    beaker.drives = new EventTarget()
    beaker.drives.status = drivesRPC.status
    beaker.drives.get = drivesRPC.get
    beaker.drives.list = drivesRPC.list
    beaker.drives.getForks = drivesRPC.getForks
    beaker.drives.configure = drivesRPC.configure
    beaker.drives.remove = drivesRPC.remove
    beaker.drives.listTrash = drivesRPC.listTrash
    beaker.drives.collectTrash = drivesRPC.collectTrash
    beaker.drives.delete = drivesRPC.delete
    beaker.drives.touch = drivesRPC.touch
    beaker.drives.clearFileCache = drivesRPC.clearFileCache
    beaker.drives.clearDnsCache = drivesRPC.clearDnsCache
    beaker.drives.getDebugLog = drivesRPC.getDebugLog
    beaker.drives.createDebugStream = () => fromEventStream(drivesRPC.createDebugStream())
    window.addEventListener('load', () => {
      try {
        bindEventStream(drivesRPC.createEventStream(), beaker.drives)
      } catch (e) {
        // permissions error
      }
    })
  }

  return beaker
}
