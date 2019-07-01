import * as rpc from 'pauls-electron-rpc'
import browserManifest from '@beaker/core/web-apis/manifests/internal/browser'
import usersManifest from '@beaker/core/web-apis/manifests/internal/users'
import archivesManifest from '@beaker/core/web-apis/manifests/internal/archives'
import bookmarksManifest from '@beaker/core/web-apis/manifests/external/bookmarks'
import historyManifest from '@beaker/core/web-apis/manifests/internal/history'
import sitedataManifest from '@beaker/core/web-apis/manifests/internal/sitedata'
import downloadsManifest from '@beaker/core/web-apis/manifests/internal/downloads'
import datArchiveManifest from '@beaker/core/web-apis/manifests/external/dat-archive'
import shellMenusManifest from '../background-process/rpc-manifests/shell-menus'
import viewsManifest from '../background-process/rpc-manifests/views'
import profilesManifest from '@beaker/core/web-apis/manifests/external/unwalled-garden-profiles'
import followsManifest from '@beaker/core/web-apis/manifests/external/unwalled-garden-follows'

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
export const profiles = rpc.importAPI('unwalled-garden-profiles', profilesManifest)
export const follows = rpc.importAPI('unwalled-garden-follows', followsManifest)