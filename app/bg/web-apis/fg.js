import * as rpc from 'pauls-electron-rpc'
import * as Hyperdrive from './fg/hyperdrive'
import * as beaker from './fg/beaker'
import * as experimental from './fg/experimental'
import * as navigatorMethods from './fg/navigator-methods'
import { ipcRenderer } from 'electron'

export const setup = function () {
  // setup APIs
  if (['beaker:', 'hyper:', 'https:', 'http:'].includes(window.location.protocol) ||
      window.location.hostname.endsWith('hyperdrive.network') /* TEMPRARY */) {
    window.Hyperdrive = Hyperdrive.setup(rpc)
    navigatorMethods.setup(rpc)
  }
  if (['beaker:', 'hyper:'].includes(window.location.protocol) ||
    window.location.hostname.endsWith('hyperdrive.network') /* TEMPRARY */) {
    window.beaker = beaker.setup(rpc)
    window.experimental = experimental.setup(rpc)

    // TEMPORARY
    window.__beakerOpenEditor = () => ipcRenderer.send('temp-open-editor-sidebar')
  }
  if (window.location.protocol === 'dat:') {
    // TEMPORARY
    window.__beakerConvertDatArchive = key => ipcRenderer.send('temp-convert-dat', key)
  }
}