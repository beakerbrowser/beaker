import { webFrame } from 'electron'
import * as rpcAPI from 'pauls-electron-rpc'
import * as beakerCoreWebview from '@beaker/core/webview'
import { setup as setupTutorial } from './webview-preload/tutorial'
import { setup as setupLocationbar } from './webview-preload/locationbar'
import { setup as setupPrompt } from './webview-preload/prompt'
import { setup as setupExecuteJavascript } from './webview-preload/execute-javascript'
import setupExitFullScreenHackfix from './webview-preload/exit-full-screen-hackfix'
import readableStreamAsyncIteratorPolyfill from './webview-preload/readable-stream-async-iterator-polyfill'
import './webview-preload/read-page-metadata'

// register protocol behaviors
/* This marks the scheme as:
 - Secure
 - Allowing Service Workers
 - Supporting Fetch API
 - CORS Enabled
*/
webFrame.registerURLSchemeAsPrivileged('dat', { bypassCSP: false })
webFrame.setSpellCheckProvider('en-US', true, beakerCoreWebview.createSpellChecker(rpcAPI))

// HACKS
setupExitFullScreenHackfix()
readableStreamAsyncIteratorPolyfill()

beakerCoreWebview.setup({ rpcAPI })
setupTutorial()
setupLocationbar()
setupPrompt()
setupExecuteJavascript()
