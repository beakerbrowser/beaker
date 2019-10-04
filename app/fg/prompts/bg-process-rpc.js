import * as rpc from 'pauls-electron-rpc'
import promptsManifest from '../../bg/rpc-manifests/prompts'
import datArchiveManifest from '../../bg/web-apis/manifests/external/dat-archive'

export const prompts = rpc.importAPI('background-process-prompts', promptsManifest)
export const datArchive = rpc.importAPI('dat-archive', datArchiveManifest)