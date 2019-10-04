import * as DatArchive from './fg/dat-archive'
import * as beaker from './fg/beaker'
import * as experimental from './fg/experimental'
import * as uwg from './fg/uwg'
import * as navigatorMethods from './fg/navigator-methods'

export const setup = function ({rpcAPI}) {
  // setup APIs
  if (['beaker:', 'dat:', 'https:'].includes(window.location.protocol) ||
      (window.location.protocol === 'http:' && window.location.hostname === 'localhost')) {
    window.DatArchive = DatArchive.setup(rpcAPI)
    navigatorMethods.setup(rpcAPI)
  }
  if (['beaker:', 'dat:'].includes(window.location.protocol)) {
    window.beaker = beaker.setup(rpcAPI)
    window.experimental = experimental.setup(rpcAPI)
    window.uwg = uwg.setup(rpcAPI)
  }
}