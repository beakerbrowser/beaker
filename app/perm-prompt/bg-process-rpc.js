import * as rpc from 'pauls-electron-rpc'
import datArchiveManifest from '@beaker/core/web-apis/manifests/external/dat-archive'
import permPromptManifest from '../background-process/rpc-manifests/perm-prompt'

export const datArchive = rpc.importAPI('dat-archive', datArchiveManifest)
export const permPrompt = rpc.importAPI('background-process-perm-prompt', permPromptManifest)