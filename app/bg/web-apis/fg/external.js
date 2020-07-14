import { fromEventStream, EventTargetFromStream } from './event-target'
import errors from 'beaker-error-constants'
import capabilitiesManifest from '../manifests/external/capabilities'
import contactsManifest from '../manifests/external/contacts'
import markdownManifest from '../manifests/external/markdown'
import panesManifest from '../manifests/external/panes'
import peersocketsManifest from '../manifests/external/peersockets'
import shellManifest from '../manifests/external/shell'

const RPC_OPTS = { timeout: false, errors }

export const setup = function (rpc) {
  var capabilities = rpc.importAPI('capabilities', capabilitiesManifest, RPC_OPTS)
  var contacts = rpc.importAPI('contacts', contactsManifest, RPC_OPTS)
  var markdown = rpc.importAPI('markdown', markdownManifest, RPC_OPTS)
  var shell = rpc.importAPI('shell', shellManifest, RPC_OPTS)

  if (window.location.protocol !== 'beaker:') {
    delete shell.importFilesAndFolders
    delete shell.importFilesDialog
    delete shell.importFoldersDialog
    delete shell.exportFilesDialog
  }

  var peersocketsRPC = rpc.importAPI('peersockets', peersocketsManifest, RPC_OPTS)
  var peersockets = {
    join (topic) {
      var stream = peersocketsRPC.join(topic)
      var obj = fromEventStream(stream)
      obj.send = (peerId, msg) => {
        stream.write([peerId, msg])
      }
      return obj
    },
    watch () {
      return fromEventStream(peersocketsRPC.watch())
    }
  }

  var panesRPC = rpc.importAPI('panes', panesManifest, RPC_OPTS)
  var panes = new EventTargetFromStream(panesRPC.createEventStream, ['pane-attached', 'pane-detached', 'pane-navigated'])
  panes.setAttachable = panesRPC.setAttachable
  panes.getAttachedPane = panesRPC.getAttachedPane
  panes.attachToLastActivePane = panesRPC.attachToLastActivePane
  panes.create = panesRPC.create
  panes.navigate = panesRPC.navigate
  panes.focus = panesRPC.focus
  panes.executeJavaScript = panesRPC.executeJavaScript
  panes.injectCss = panesRPC.injectCss
  panes.uninjectCss = panesRPC.uninjectCss

  var _terminalCommands = []
  var terminal = {
    getCommands () {
      return (_terminalCommands || []).slice().map(obj => Object.assign({}, obj))
    },
    registerCommand (command) {
      if (!command || typeof command !== 'object') throw new Error('Command must be an object')
      if (!command.handle || typeof command.handle !== 'function') throw new Error('Command must have a \`handle\` function')
      if (!command.name || typeof command.name !== 'string') throw new Error('Command must have a \`name\` string')
      if (command.help && typeof command.help !== 'string') throw new Error('The \`help\` attribute on a command must be a string')
      if (command.usage && typeof command.usage !== 'string') throw new Error('The \`usage\` attribute on a command must be a string')
      if (command.options && !Array.isArray(command.options)) throw new Error('The \`options\` attribute on a command must be an array')

      let i = _terminalCommands.findIndex(c => c.name === command.name)
      if (i !== -1) throw new Error('A "' + command.name + '" command has already been registered')
      _terminalCommands.push({
        handle: command.handle,
        name: command.name,
        help: command.help,
        usage: command.usage,
        options: command.options
      })
    },
    unregisterCommand (name) {
      let i = _terminalCommands.findIndex(c => c.name === name)
      if (i !== -1) _terminalCommands.splice(i, 1)
    }
  }

  return {capabilities, contacts, markdown, panes, peersockets, shell, terminal}
}
