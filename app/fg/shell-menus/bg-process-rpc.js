import * as rpc from 'pauls-electron-rpc'
import browserManifest from '../../bg/web-apis/manifests/internal/browser'
import drivesManifest from '../../bg/web-apis/manifests/internal/drives'
import bookmarksManifest from '../../bg/web-apis/manifests/internal/bookmarks'
import historyManifest from '../../bg/web-apis/manifests/internal/history'
import sitedataManifest from '../../bg/web-apis/manifests/internal/sitedata'
import downloadsManifest from '../../bg/web-apis/manifests/internal/downloads'
import hyperdriveManifest from '../../bg/web-apis/manifests/external/hyperdrive'
import navigatorManifest from '../../bg/web-apis/manifests/external/navigator'
import navigatorManifestFs from '../../bg/web-apis/manifests/external/navigator-filesystem'
import shellMenusManifest from '../../bg/rpc-manifests/shell-menus'
import viewsManifest from '../../bg/rpc-manifests/views'

export const beakerBrowser = rpc.importAPI('beaker-browser', browserManifest)
export const drives = rpc.importAPI('drives', drivesManifest)
export const bookmarks = rpc.importAPI('bookmarks', bookmarksManifest)
export const history = rpc.importAPI('history', historyManifest)
export const sitedata = rpc.importAPI('sitedata', sitedataManifest)
export const downloads = rpc.importAPI('downloads', downloadsManifest)
export const hyperdrive = rpc.importAPI('hyperdrive', hyperdriveManifest)
export const navigator = rpc.importAPI('navigator', navigatorManifest)
export const navigatorFs = rpc.importAPI('navigator-filesystem', navigatorManifestFs)
export const shellMenus = rpc.importAPI('background-process-shell-menus', shellMenusManifest)
export const views = rpc.importAPI('background-process-views', viewsManifest)