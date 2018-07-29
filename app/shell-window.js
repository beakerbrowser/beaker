import * as rpcAPI from 'pauls-electron-rpc'
const beakerCoreWebview = require ('@beaker/core/webview')
import { ipcRenderer } from 'electron'
import { setup as setupUI } from './shell-window/ui'

beakerCoreWebview.setup({rpcAPI})
setupUI(() => {
  ipcRenderer.send('shell-window:ready')
})
