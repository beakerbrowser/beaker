import errors from 'beaker-error-constants'
import manifest from '../manifests/external/navigator'
import sessionManifest from '../manifests/external/navigator-session'
import filesystemManifest from '../manifests/external/navigator-filesystem'

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
  try {
    navigator.filesystem = new Hyperdrive(filesystemApi.get().url)
  } catch (e) {
    // not supported
  }

  var _terminalCommands = []
  navigator.terminal = {
    get commands () {
      return _terminalCommands
    },
    registerCommands (commands) {
      if (!commands || !Array.isArray(commands)) throw new Error('Must provide an array of commands')
      for (let command of commands) {
        if (!command || typeof command !== 'object') throw new Error('Each command must be an object')
        if (!command.handle || typeof command.handle !== 'function') throw new Error('Each command must have a `handle` function')
        if (!command.name || typeof command.name !== 'string') throw new Error('Each command must have a `name` string')
        if (command.help && typeof command.help !== 'string') throw new Error('The `help` attribute on a command must be a string')
        if (command.usage && typeof command.usage !== 'string') throw new Error('The `usage` attribute on a command must be a string')
      }
      _terminalCommands = commands
    }
  }
}
