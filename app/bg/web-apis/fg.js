import * as rpc from 'pauls-electron-rpc'
import * as Hyperdrive from './fg/hyperdrive'
import * as beaker from './fg/beaker'
import * as experimental from './fg/experimental'
import * as navigatorMethods from './fg/navigator-methods'

export const setup = function () {
  // setup APIs
  if (['beaker:', 'drive:', 'web:', 'https:'].includes(window.location.protocol) ||
      (window.location.protocol === 'http:' && window.location.hostname === 'localhost')) {
    window.Hyperdrive = Hyperdrive.setup(rpc)
    navigatorMethods.setup(rpc)
  }
  if (['beaker:', 'drive:', 'web:'].includes(window.location.protocol)) {
    window.beaker = beaker.setup(rpc)
    window.experimental = experimental.setup(rpc)
  }
}