import * as rpc from 'pauls-electron-rpc'
import browserManifest from '../../bg/web-apis/manifests/internal/browser'
import usersManifest from '../../bg/web-apis/manifests/internal/users'
import archivesManifest from '../../bg/web-apis/manifests/internal/archives'
import bookmarksManifest from '../../bg/web-apis/manifests/internal/bookmarks'
import historyManifest from '../../bg/web-apis/manifests/internal/history'
import sitedataManifest from '../../bg/web-apis/manifests/internal/sitedata'
import downloadsManifest from '../../bg/web-apis/manifests/internal/downloads'
import datArchiveManifest from '../../bg/web-apis/manifests/external/dat-archive'
import shellMenusManifest from '../../bg/rpc-manifests/shell-menus'
import viewsManifest from '../../bg/rpc-manifests/views'

export const beakerBrowser = rpc.importAPI('beaker-browser', browserManifest)
export const users = rpc.importAPI('users', usersManifest)
export const archives = rpc.importAPI('archives', archivesManifest)
export const bookmarks = rpc.importAPI('bookmarks', bookmarksManifest)
export const history = rpc.importAPI('history', historyManifest)
export const sitedata = rpc.importAPI('sitedata', sitedataManifest)
export const downloads = rpc.importAPI('downloads', downloadsManifest)
export const datArchive = rpc.importAPI('dat-archive', datArchiveManifest)
export const shellMenus = rpc.importAPI('background-process-shell-menus', shellMenusManifest)
export const views = rpc.importAPI('background-process-views', viewsManifest)