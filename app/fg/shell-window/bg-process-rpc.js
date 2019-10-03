import * as rpc from 'pauls-electron-rpc'
import browserManifest from '@beaker/core/web-apis/manifests/internal/browser'
import bookmarksManifest from '@beaker/core/web-apis/manifests/external/unwalled-garden-bookmarks'
import followsManifest from '@beaker/core/web-apis/manifests/external/unwalled-garden-follows'
import libraryManifest from '@beaker/core/web-apis/manifests/external/unwalled-garden-library'
import watchlistManifest from '@beaker/core/web-apis/manifests/internal/watchlist'
import viewsManifest from '../../background-process/rpc-manifests/views'
import datArchiveManifest from '@beaker/core/web-apis/manifests/external/dat-archive'

export const beakerBrowser = rpc.importAPI('beaker-browser', browserManifest)
export const bookmarks = rpc.importAPI('unwalled-garden-bookmarks', bookmarksManifest)
export const follows = rpc.importAPI('unwalled-garden-follows', followsManifest)
export const library = rpc.importAPI('unwalled-garden-library', libraryManifest)
export const watchlist = rpc.importAPI('watchlist', watchlistManifest)
export const views = rpc.importAPI('background-process-views', viewsManifest)
export const datArchive = rpc.importAPI('dat-archive', datArchiveManifest)