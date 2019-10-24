import * as rpc from 'pauls-electron-rpc'
import browserManifest from '../../bg/web-apis/manifests/internal/browser'
import programsManifest from '../../bg/web-apis/manifests/internal/programs'
import watchlistManifest from '../../bg/web-apis/manifests/internal/watchlist'
import viewsManifest from '../../bg/rpc-manifests/views'
import datArchiveManifest from '../../bg/web-apis/manifests/external/dat-archive'

export const beakerBrowser = rpc.importAPI('beaker-browser', browserManifest)
export const programs = rpc.importAPI('programs', programsManifest)
export const watchlist = rpc.importAPI('watchlist', watchlistManifest)
export const views = rpc.importAPI('background-process-views', viewsManifest)
export const datArchive = rpc.importAPI('dat-archive', datArchiveManifest)