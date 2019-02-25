import * as rpc from 'pauls-electron-rpc'
import browserManifest from '@beaker/core/web-apis/manifests/internal/browser'
import archivesManifest from '@beaker/core/web-apis/manifests/internal/archives'
import datArchiveManifest from '@beaker/core/web-apis/manifests/external/dat-archive'
import shellMenusManifest from '../background-process/rpc-manifests/shell-menus'

export const beakerBrowser = rpc.importAPI('beaker-browser', browserManifest)
export const archives = rpc.importAPI('archives', archivesManifest)
export const datArchive = rpc.importAPI('dat-archive', datArchiveManifest)
export const shellMenus = rpc.importAPI('background-process-shell-menus', shellMenusManifest)