console.log('hello')
import * as rpcAPI from 'pauls-electron-rpc'
const beakerCoreWebview = require ('@beaker/core/webview')
import { ipcRenderer } from 'electron'
import { setup as setupUI } from './shell-window/ui'

console.log('setting up webview')
beakerCoreWebview.setup({rpcAPI})
console.log('setting up ui')
setupUI(() => {
  console.log('ready')
  ipcRenderer.send('shell-window:ready')
})
