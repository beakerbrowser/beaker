import * as rpc from 'pauls-electron-rpc'
import browserManifest from '../../bg/web-apis/manifests/internal/browser'
import datArchiveManifest from '../../bg/web-apis/manifests/external/dat-archive'
import permPromptManifest from '../../bg/rpc-manifests/perm-prompt'

export const beakerBrowser = rpc.importAPI('beaker-browser', browserManifest)
export const datArchive = rpc.importAPI('dat-archive', datArchiveManifest)
export const permPrompt = rpc.importAPI('background-process-perm-prompt', permPromptManifest)