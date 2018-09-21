import {webFrame} from 'electron'
import * as rpcAPI from 'pauls-electron-rpc'
import * as beakerCoreWebview from '@beaker/core/webview'
import { setup as setupLocationbar } from './webview-preload/locationbar'
import { setup as setupPrompt } from './webview-preload/prompt'
import setupExitFullScreenHackfix from './webview-preload/exit-full-screen-hackfix'

// register protocol behaviors  
/* This marks the scheme as:  
 - Secure 
 - Allowing Service Workers 
 - Supporting Fetch API 
 - CORS Enabled 
*/  
webFrame.registerURLSchemeAsPrivileged('dat', { bypassCSP: false })

// HACKS
setupExitFullScreenHackfix()

beakerCoreWebview.setup({rpcAPI})
setupLocationbar()
setupPrompt()
