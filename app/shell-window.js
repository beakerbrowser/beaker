import * as rpcAPI from 'pauls-electron-rpc'
const beakerCoreWebview = require ('@beaker/core/webview')
import { ipcRenderer } from 'electron'
import { setup as setupUI } from './shell-window/ui'

beakerCoreWebview.setup({rpcAPI})
setupUI(() => {
  ipcRenderer.send('shell-window:ready')
})

// DEBUG
import {getScreenshot} from './shell-window/get-screenshot'
window.getScreenshot = getScreenshot
window.captureTemplate = async function (url, title) {
  if (!url) throw 'Need url'
  if (!url.startsWith('dat://')) throw new 'Need dat url'
  if (!title) throw 'Need title'
  var screenshot = await getScreenshot(url, {width: 800, height: 600}, {resizeTo: {width: 160, height: 120}})
  await beaker.archives.putTemplate(url, {title, screenshot: screenshot.toDataURL()})
}