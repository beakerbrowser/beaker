import * as rpc from 'pauls-electron-rpc'
import browserManifest from '../../bg/web-apis/manifests/internal/browser'
import drivesManifest from '../../bg/web-apis/manifests/internal/drives'
import hyperdriveManifest from '../../bg/web-apis/manifests/external/hyperdrive'
import modalsManifest from '../../bg/rpc-manifests/modals'
import navigatorFsManifest from '../../bg/web-apis/manifests/external/navigator-filesystem'

export const beakerBrowser = rpc.importAPI('beaker-browser', browserManifest)
export const drives = rpc.importAPI('drives', drivesManifest)
export const hyperdrive = rpc.importAPI('hyperdrive', hyperdriveManifest)
export const modals = rpc.importAPI('background-process-modals', modalsManifest)
export const navigatorFs = rpc.importAPI('navigator-filesystem', navigatorFsManifest)