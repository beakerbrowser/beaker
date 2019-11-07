import errors from 'beaker-error-constants'
import manifest from '../manifests/external/navigator'
import sessionManifest from '../manifests/external/navigator-session'
import filesystemManifest from '../manifests/external/navigator-filesystem'
import Stat from './stat'

const RPC_OPTS = { timeout: false, errors }

export const setup = function (rpc) {
  var api = rpc.importAPI('navigator', manifest, RPC_OPTS)
  for (let k in manifest) {
    if (typeof api[k] === 'function') {
      navigator[k] = api[k].bind(api)
    }
  }

  navigator.session = {}
  var sessionApi = rpc.importAPI('navigator-session', sessionManifest, RPC_OPTS)
  for (let k in sessionManifest) {
    if (typeof sessionApi[k] === 'function') {
      navigator.session[k] = sessionApi[k].bind(sessionApi)
    }
  }

  var filesystemApi = rpc.importAPI('navigator-filesystem', filesystemManifest, RPC_OPTS)
  navigator.filesystem = new DatArchive(filesystemApi.get().url)
  navigator.filesystem.identifyDrive = async (url) => {
    if (url instanceof DatArchive) {
      url = url.url
    }
    return filesystemApi.identifyDrive(url)
  }
  navigator.filesystem.query = async (opts) => {
    var res = await filesystemApi.query(opts)
    res.forEach(item => {
      if (item.stat) item.stat = new Stat(item.stat)
    })
    return res
  }
}
