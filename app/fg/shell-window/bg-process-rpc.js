import * as rpc from 'pauls-electron-rpc'
import browserManifest from '../../bg/web-apis/manifests/internal/browser'
import bookmarksManifest from '../../bg/web-apis/manifests/external/unwalled-garden-bookmarks'
import followsManifest from '../../bg/web-apis/manifests/external/unwalled-garden-follows'
import libraryManifest from '../../bg/web-apis/manifests/external/unwalled-garden-library'
import programsManifest from '../../bg/web-apis/manifests/internal/programs'
import watchlistManifest from '../../bg/web-apis/manifests/internal/watchlist'
import viewsManifest from '../../bg/rpc-manifests/views'
import datArchiveManifest from '../../bg/web-apis/manifests/external/dat-archive'

export const beakerBrowser = rpc.importAPI('beaker-browser', browserManifest)
export const bookmarks = rpc.importAPI('unwalled-garden-bookmarks', bookmarksManifest)
export const follows = rpc.importAPI('unwalled-garden-follows', followsManifest)
export const library = rpc.importAPI('unwalled-garden-library', libraryManifest)
export const programs = rpc.importAPI('programs', programsManifest)
export const watchlist = rpc.importAPI('watchlist', watchlistManifest)
export const views = rpc.importAPI('background-process-views', viewsManifest)
export const datArchive = rpc.importAPI('dat-archive', datArchiveManifest)