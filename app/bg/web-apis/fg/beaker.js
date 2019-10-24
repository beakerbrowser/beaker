import { EventTarget, bindEventStream, fromEventStream } from './event-target'
import errors from 'beaker-error-constants'
import loggerManifest from '../manifests/internal/logger'
import archivesManifest from '../manifests/internal/archives'
import beakerBrowserManifest from '../manifests/internal/browser'
import bookmarksManifest from '../manifests/internal/bookmarks'
import downloadsManifest from '../manifests/internal/downloads'
import historyManifest from '../manifests/internal/history'
import sitedataManifest from '../manifests/internal/sitedata'
import watchlistManifest from '../manifests/internal/watchlist'
import usersManifest from '../manifests/internal/users'
import programsManifest from '../manifests/internal/programs'
import typesManifest from '../manifests/internal/types'

export const setup = function (rpc) {
  const beaker = {}
  const opts = { timeout: false, errors }

  // internal only
  if (window.location.protocol === 'beaker:') {
    const loggerRPC = rpc.importAPI('logger', loggerManifest, opts)
    const archivesRPC = rpc.importAPI('archives', archivesManifest, opts)
    const beakerBrowserRPC = rpc.importAPI('beaker-browser', beakerBrowserManifest, opts)
    const bookmarksRPC = rpc.importAPI('bookmarks', bookmarksManifest, opts)
    const downloadsRPC = rpc.importAPI('downloads', downloadsManifest, opts)
    const historyRPC = rpc.importAPI('history', historyManifest, opts)
    const sitedataRPC = rpc.importAPI('sitedata', sitedataManifest, opts)
    const watchlistRPC = rpc.importAPI('watchlist', watchlistManifest, opts)
    const usersRPC = rpc.importAPI('users', usersManifest, opts)
    const programsRPC = rpc.importAPI('programs', programsManifest, opts)
    const typesRPC = rpc.importAPI('types', typesManifest, opts)

    // attach APIs
    beaker.browser = Object.assign({}, beakerBrowserRPC)
    beaker.browser.createEventsStream = () => fromEventStream(beakerBrowserRPC.createEventsStream())
    beaker.bookmarks = Object.assign({}, bookmarksRPC)
    beaker.downloads = Object.assign({}, downloadsRPC)
    beaker.downloads.createEventsStream = () => fromEventStream(downloadsRPC.createEventsStream())
    beaker.history = Object.assign({}, historyRPC)
    beaker.logger = Object.assign({}, loggerRPC)
    beaker.logger.stream = (opts) => fromEventStream(loggerRPC.stream(opts))
    beaker.programs = Object.assign({}, programsRPC)
    beaker.sitedata = Object.assign({}, sitedataRPC)
    beaker.users = Object.assign({}, usersRPC)
    beaker.types = Object.assign({}, typesRPC)
    beaker.watchlist = Object.assign({}, watchlistRPC)
    beaker.watchlist.createEventsStream = () => fromEventStream(watchlistRPC.createEventsStream())

    // beaker.archives
    beaker.archives = new EventTarget()
    beaker.archives.status = archivesRPC.status
    beaker.archives.listTrash = archivesRPC.listTrash
    beaker.archives.collectTrash = archivesRPC.collectTrash
    beaker.archives.delete = archivesRPC.delete
    beaker.archives.touch = archivesRPC.touch
    beaker.archives.clearFileCache = archivesRPC.clearFileCache
    beaker.archives.clearDnsCache = archivesRPC.clearDnsCache
    beaker.archives.getDebugLog = archivesRPC.getDebugLog
    beaker.archives.createDebugStream = () => fromEventStream(archivesRPC.createDebugStream())
    window.addEventListener('load', () => {
      try {
        bindEventStream(archivesRPC.createEventStream(), beaker.archives)
      } catch (e) {
        // permissions error
      }
    })
  }

  return beaker
}
