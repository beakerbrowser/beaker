import * as rpc from 'pauls-electron-rpc'
import browserManifest from '../../bg/web-apis/manifests/internal/browser'
import usersManifest from '../../bg/web-apis/manifests/internal/users'
import archivesManifest from '../../bg/web-apis/manifests/internal/archives'
import typesManifest from '../../bg/web-apis/manifests/internal/types'
import datArchiveManifest from '../../bg/web-apis/manifests/external/dat-archive'
import modalsManifest from '../../bg/rpc-manifests/modals'

export const beakerBrowser = rpc.importAPI('beaker-browser', browserManifest)
export const users = rpc.importAPI('users', usersManifest)
export const archives = rpc.importAPI('archives', archivesManifest)
export const types = rpc.importAPI('types', typesManifest)
export const datArchive = rpc.importAPI('dat-archive', datArchiveManifest)
export const modals = rpc.importAPI('background-process-modals', modalsManifest)