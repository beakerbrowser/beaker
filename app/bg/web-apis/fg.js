import * as rpc from 'pauls-electron-rpc'
import * as Hyperdrive from './fg/hyperdrive'
import * as beaker from './fg/beaker'
import * as experimental from './fg/experimental'
import * as navigatorMethods from './fg/navigator-methods'
import { ipcRenderer, contextBridge, webFrame } from 'electron'

export const setup = function () {
  // setup APIs
  if (['beaker:', 'hyper:', 'https:', 'http:', 'data:'].includes(window.location.protocol) ||
      window.location.hostname.endsWith('hyperdrive.network') /* TEMPRARY */) {
    contextBridge.exposeInMainWorld('hyperdrive', Hyperdrive.setup(rpc))
    navigatorMethods.setup(rpc)
  }
  if (['beaker:', 'hyper:'].includes(window.location.protocol) ||
    window.location.hostname.endsWith('hyperdrive.network') /* TEMPRARY */) {
    contextBridge.exposeInMainWorld('beaker', beaker.setup(rpc))
    contextBridge.exposeInMainWorld('experimental', experimental.setup(rpc))

    // TEMPORARY
    contextBridge.exposeInMainWorld('__internalBeakerEditor', {
      open: () => ipcRenderer.send('temp-open-editor-sidebar')
    })
  }
  if (window.location.protocol === 'dat:') {
    // TEMPORARY
    contextBridge.exposeInMainWorld('__internalBeakerDatArchive', {
      convert: key => ipcRenderer.send('temp-convert-dat', key)
    })
  }
}