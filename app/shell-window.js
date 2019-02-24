import * as rpcAPI from 'pauls-electron-rpc'
const beakerCoreWebview = require('@beaker/core/webview')
import { ipcRenderer } from 'electron'
// import * as pages from './shell-window/pages'
// import * as navbar from './shell-window/ui/navbar'
// import { setup as setupUI } from './shell-window/ui'

// attach some window globals
// window.pages = pages
// window.navbar = navbar

// setup
beakerCoreWebview.setup({rpcAPI})
document.addEventListener('DOMContentLoaded', () => {
  // setupUI(() => {
    ipcRenderer.send('shell-window:ready')
  // })
})
