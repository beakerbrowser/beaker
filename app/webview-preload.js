import * as rpcAPI from 'pauls-electron-rpc'
import * as beakerCoreWebview from '@beaker/core/webview'
import { setup as setupLocationbar } from './webview-preload/locationbar'
import { setup as setupPrompt } from './webview-preload/prompt'
import setupExitFullScreenHackfix from './webview-preload/exit-full-screen-hackfix'

// HACKS
setupExitFullScreenHackfix()

beakerCoreWebview.setup({rpcAPI})
setupLocationbar()
setupPrompt()
