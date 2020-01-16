import * as rpc from 'pauls-electron-rpc'
import browserManifest from '../../bg/web-apis/manifests/internal/browser'
import hyperdriveManifest from '../../bg/web-apis/manifests/external/hyperdrive'
import permPromptManifest from '../../bg/rpc-manifests/perm-prompt'

export const beakerBrowser = rpc.importAPI('beaker-browser', browserManifest)
export const hyperdrive = rpc.importAPI('hyperdrive', hyperdriveManifest)
export const permPrompt = rpc.importAPI('background-process-perm-prompt', permPromptManifest)