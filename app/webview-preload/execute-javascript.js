import {webFrame, ipcRenderer} from 'electron'

export function setup (code) {
  ipcRenderer.on('execute-javascript:call', (e, reqId, code) => {
    webFrame.executeJavaScriptInIsolatedWorld(1, [{code}], true, res => {
      ipcRenderer.sendToHost('execute-javascript:result', reqId, res)
    })
  })
}