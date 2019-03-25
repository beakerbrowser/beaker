import { webFrame } from 'electron'
import * as rpcAPI from 'pauls-electron-rpc'
import * as beakerCoreWebview from '@beaker/core/webview'
import { setup as setupLocationbar } from './webview-preload/locationbar'
import { setup as setupPrompt } from './webview-preload/prompt'
import { setup as setupExecuteJavascript } from './webview-preload/execute-javascript'
import setupExitFullScreenHackfix from './webview-preload/exit-full-screen-hackfix'
import readableStreamAsyncIteratorPolyfill from './webview-preload/readable-stream-async-iterator-polyfill'

webFrame.setSpellCheckProvider('en-US', beakerCoreWebview.createSpellChecker(rpcAPI))

// HACKS
setupExitFullScreenHackfix()
readableStreamAsyncIteratorPolyfill()

beakerCoreWebview.setup({ rpcAPI })
setupLocationbar()
setupPrompt()
setupExecuteJavascript()
