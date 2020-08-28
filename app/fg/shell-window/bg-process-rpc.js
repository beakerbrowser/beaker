import * as rpc from 'pauls-electron-rpc'
import bookmarksManifest from '../../bg/web-apis/manifests/internal/bookmarks'
import browserManifest from '../../bg/web-apis/manifests/internal/browser'
import databaseManifest from '../../bg/web-apis/manifests/external/database'
import folderSyncManifest from '../../bg/web-apis/manifests/internal/folder-sync'
import historyManifest from '../../bg/web-apis/manifests/internal/history'
import hyperdriveManifest from '../../bg/web-apis/manifests/external/hyperdrive'
import overlayManifest from '../../bg/rpc-manifests/overlay'
import subscriptionsManifest from '../../bg/web-apis/manifests/external/subscriptions'
import toolbarManifest from '../../bg/rpc-manifests/toolbar'
import viewsManifest from '../../bg/rpc-manifests/views'
import watchlistManifest from '../../bg/web-apis/manifests/internal/watchlist'

export const bookmarks = rpc.importAPI('bookmarks', bookmarksManifest)
export const beakerBrowser = rpc.importAPI('beaker-browser', browserManifest)
export const database = rpc.importAPI('database', databaseManifest)
export const folderSync = rpc.importAPI('folder-sync', folderSyncManifest)
export const history = rpc.importAPI('history', historyManifest)
export const hyperdrive = rpc.importAPI('hyperdrive', hyperdriveManifest)
export const overlay = rpc.importAPI('background-process-overlay', overlayManifest)
export const subscriptions = rpc.importAPI('subscriptions', subscriptionsManifest)
export const toolbar = rpc.importAPI('background-process-toolbar', toolbarManifest)
export const views = rpc.importAPI('background-process-views', viewsManifest)
export const watchlist = rpc.importAPI('watchlist', watchlistManifest)
