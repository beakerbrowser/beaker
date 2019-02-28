import * as rpc from 'pauls-electron-rpc'
import datArchiveManifest from '@beaker/core/web-apis/manifests/external/dat-archive'
import modalsManifest from '../background-process/rpc-manifests/modals'

export const datArchive = rpc.importAPI('dat-archive', datArchiveManifest)
export const modals = rpc.importAPI('background-process-modals', modalsManifest)