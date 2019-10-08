import { EventTarget, bindEventStream, fromEventStream } from './event-target'
import errors from 'beaker-error-constants'
import loggerManifest from '../manifests/internal/logger'
import archivesManifest from '../manifests/internal/archives'
import beakerBrowserManifest from '../manifests/internal/browser'
import downloadsManifest from '../manifests/internal/downloads'
import historyManifest from '../manifests/internal/history'
import sitedataManifest from '../manifests/internal/sitedata'
import watchlistManifest from '../manifests/internal/watchlist'
import crawlerManifest from '../manifests/internal/crawler'
import usersManifest from '../manifests/internal/users'
import searchManifest from '../manifests/internal/search'
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
    const downloadsRPC = rpc.importAPI('downloads', downloadsManifest, opts)
    const historyRPC = rpc.importAPI('history', historyManifest, opts)
    const sitedataRPC = rpc.importAPI('sitedata', sitedataManifest, opts)
    const watchlistRPC = rpc.importAPI('watchlist', watchlistManifest, opts)
    const crawlerRPC = rpc.importAPI('crawler', crawlerManifest, opts)
    const usersRPC = rpc.importAPI('users', usersManifest, opts)
    const searchRPC = rpc.importAPI('search', searchManifest, opts)
    const programsRPC = rpc.importAPI('programs', programsManifest, opts)
    const typesRPC = rpc.importAPI('types', typesManifest, opts)

    // attach APIs
    beaker.browser = beakerBrowserRPC
    beaker.browser.createEventsStream = () => fromEventStream(beakerBrowserRPC.createEventsStream())
    beaker.crawler = crawlerRPC
    beaker.crawler.createEventsStream = () => fromEventStream(crawlerRPC.createEventsStream())
    beaker.downloads = downloadsRPC
    beaker.downloads.createEventsStream = () => fromEventStream(downloadsRPC.createEventsStream())
    beaker.history = historyRPC
    beaker.logger = loggerRPC
    beaker.logger.stream = (opts) => fromEventStream(loggerRPC.stream(opts))
    beaker.programs = programsRPC
    beaker.sitedata = sitedataRPC
    beaker.users = usersRPC
    beaker.search = searchRPC
    beaker.types = typesRPC
    beaker.watchlist = watchlistRPC
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
