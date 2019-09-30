import { webFrame } from 'electron'
import * as rpcAPI from 'pauls-electron-rpc'
import * as beakerCoreWebview from '@beaker/core/webview'
import { setup as setupTutorial } from './webview-preload/tutorial'
import { setup as setupLocationbar } from './webview-preload/locationbar'
import { setup as setupPrompt } from './webview-preload/prompt'
import { setup as setupExecuteJavascript } from './webview-preload/execute-javascript'
import setupExitFullScreenHackfix from './webview-preload/exit-full-screen-hackfix'
import readableStreamAsyncIteratorPolyfill from './webview-preload/readable-stream-async-iterator-polyfill'
import windowOpenCloseHackfix from './webview-preload/window-open-close-hackfix'
import resizeHackfix from './webview-preload/resize-hackfix'
// import './webview-preload/read-page-metadata' DISABLED wasnt working effectively -prf

webFrame.setSpellCheckProvider('en-US', beakerCoreWebview.createSpellChecker(rpcAPI))

// HACKS
setupExitFullScreenHackfix()
readableStreamAsyncIteratorPolyfill()
windowOpenCloseHackfix()
resizeHackfix()

beakerCoreWebview.setup({ rpcAPI })
setupTutorial()
setupLocationbar()
setupPrompt()
setupExecuteJavascript()
