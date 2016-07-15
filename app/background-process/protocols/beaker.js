import { protocol } from 'electron'
import path from 'path'

export function setup () {
  protocol.registerFileProtocol('beaker', (request, cb) => {
    // FIXME
    // if-casing every possible asset is pretty dumb
    // generalize this
    // -prf

    // browser ui
    if (request.url == 'beaker:shell-window')
      return cb(path.join(__dirname, 'shell-window.html'))
    if (request.url == 'beaker:shell-window.js')
      return cb(path.join(__dirname, 'shell-window.build.js'))
    if (request.url == 'beaker:shell-window.css')
      return cb(path.join(__dirname, 'stylesheets/shell-window.css'))
    if (request.url == 'beaker:shell-tab-left.svg')
      return cb(path.join(__dirname, 'img/tab-left.svg'))
    if (request.url == 'beaker:shell-tab-right.svg')
      return cb(path.join(__dirname, 'img/tab-right.svg'))

    // builtin pages
    for (let slug of ['start', 'history', 'subscriptions', 'my-sites']) {
      if (request.url == `beaker:${slug}`)
        return cb(path.join(__dirname, 'builtin-pages/builtin-pages.html'))
    }
    if (request.url == 'beaker:builtin-pages.js')
      return cb(path.join(__dirname, 'builtin-pages/builtin-pages.build.js'))
    if (request.url == 'beaker:builtin-pages.css')
      return cb(path.join(__dirname, 'stylesheets/builtin-pages/builtin-pages.css'))

    // view-dat page
    if (request.url == 'beaker:view-dat.js')
      return cb(path.join(__dirname, 'builtin-pages/view-dat.build.js'))
    if (request.url == 'beaker:view-dat.css')
      return cb(path.join(__dirname, 'stylesheets/builtin-pages/view-dat.css'))

    // common assets
    if (request.url == 'beaker:font')
      return cb(path.join(__dirname, 'fonts/photon-entypo.woff'))
    return cb(-6)
  }, e => {
    if (e)
      console.error('Failed to register beaker protocol', e)
  });
}