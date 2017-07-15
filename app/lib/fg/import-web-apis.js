import { ipcRenderer } from 'electron'
import rpc from 'pauls-electron-rpc'

// method which will populate window.beaker with the APIs deemed appropriate for the protocol
export default function () {
  var webAPIs = ipcRenderer.sendSync('get-web-api-manifests', window.location.protocol)
  for (var k in webAPIs) {
    window[k] = rpc.importAPI(k, webAPIs[k], { timeout: false, noEval: (window.location.protocol === 'beaker:') })
  }
}
