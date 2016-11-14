import { ipcRenderer } from 'electron'
import rpc from 'pauls-electron-rpc'

// it would be better to import this from package.json
const BEAKER_VERSION = '0.0.1'

// method which will populate window.beaker with the APIs deemed appropriate for the protocol
export default function () {
  var webAPIs = ipcRenderer.sendSync('get-web-api-manifests', window.location.protocol)
  for (var k in webAPIs) {
    window[k] = rpc.importAPI(k, webAPIs[k], { timeout: false, noEval: (window.location.protocol === 'beaker:') })
  }
}