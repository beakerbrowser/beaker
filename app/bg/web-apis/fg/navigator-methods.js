import { contextBridge, webFrame } from 'electron'
import errors from 'beaker-error-constants'
import manifest from '../manifests/external/navigator'
import sessionManifest from '../manifests/external/navigator-session'

const RPC_OPTS = { timeout: false, errors }

export const setup = function (rpc) {
  var api = rpc.importAPI('navigator', manifest, RPC_OPTS)
  contextBridge.exposeInMainWorld('__internalNavigatorMethods', api)
  webFrame.executeJavaScript(`
    for (let k in __internalNavigatorMethods) {
      if (typeof __internalNavigatorMethods[k] === 'function') {
        navigator[k] = (...args) => __internalNavigatorMethods[k](...args)
      }
    }
  `)

  navigator.session = {}
  var sessionApi = rpc.importAPI('navigator-session', sessionManifest, RPC_OPTS)
  contextBridge.exposeInMainWorld('__internalNavigatorSessionMethods', sessionApi)
  webFrame.executeJavaScript(`
    navigator.session = __internalNavigatorSessionMethods
  `)

  webFrame.executeJavaScript(`
  var _terminalCommands = []
  navigator.terminal = {
    get commands () {
      return _terminalCommands.slice().map(obj => Object.assign({}, obj))
    },
    registerCommand (command) {
      if (!command || typeof command !== 'object') throw new Error('Command must be an object')
      if (!command.handle || typeof command.handle !== 'function') throw new Error('Command must have a \`handle\` function')
      if (!command.name || typeof command.name !== 'string') throw new Error('Command must have a \`name\` string')
      if (command.help && typeof command.help !== 'string') throw new Error('The \`help\` attribute on a command must be a string')
      if (command.usage && typeof command.usage !== 'string') throw new Error('The \`usage\` attribute on a command must be a string')

      let i = _terminalCommands.findIndex(c => c.name === command.name)
      if (i !== -1) throw new Error('A "' + command.name + '" command has already been registered')

      _terminalCommands.push({
        handle: command.handle,
        name: command.name,
        help: command.help,
        usage: command.usage
      })
    },
    unregisterCommand (name) {
      let i = _terminalCommands.findIndex(c => c.name === name)
      if (i !== -1) _terminalCommands.splice(i, 1)
    }
  }
  `)
}
