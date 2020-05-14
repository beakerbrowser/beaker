import * as rpc from 'pauls-electron-rpc'
import browserManifest from '../../bg/web-apis/manifests/internal/browser'
import watchlistManifest from '../../bg/web-apis/manifests/internal/watchlist'
import viewsManifest from '../../bg/rpc-manifests/views'
import hyperdriveManifest from '../../bg/web-apis/manifests/external/hyperdrive'

export const beakerBrowser = rpc.importAPI('beaker-browser', browserManifest)
export const watchlist = rpc.importAPI('watchlist', watchlistManifest)
export const views = rpc.importAPI('background-process-views', viewsManifest)
export const hyperdrive = rpc.importAPI('hyperdrive', hyperdriveManifest)