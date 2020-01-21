import * as rpc from 'pauls-electron-rpc'
import * as Hyperdrive from './fg/hyperdrive'
import * as beaker from './fg/beaker'
import * as experimental from './fg/experimental'
import * as navigatorMethods from './fg/navigator-methods'

export const setup = function () {
  // setup APIs
  if (['beaker:', 'hd:', 'https:'].includes(window.location.protocol) ||
      (window.location.protocol === 'http:' && window.location.hostname === 'localhost') ||
      window.location.hostname.endsWith('hyperdrive.network') /* TEMPRARY */) {
    window.Hyperdrive = Hyperdrive.setup(rpc)
    navigatorMethods.setup(rpc)
  }
  if (['beaker:', 'hd:'].includes(window.location.protocol) ||
    window.location.hostname.endsWith('hyperdrive.network') /* TEMPRARY */) {
    window.beaker = beaker.setup(rpc)
    window.experimental = experimental.setup(rpc)
  }
}