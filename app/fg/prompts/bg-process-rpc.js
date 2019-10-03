import * as rpc from 'pauls-electron-rpc'
import promptsManifest from '../../background-process/rpc-manifests/prompts'
import datArchiveManifest from '@beaker/core/web-apis/manifests/external/dat-archive'

export const prompts = rpc.importAPI('background-process-prompts', promptsManifest)
export const datArchive = rpc.importAPI('dat-archive', datArchiveManifest)