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

    // builtin pages
    for (let slug of ['start', 'archives', 'history', 'downloads', 'settings']) {
      if (request.url == `beaker:${slug}`)
        return cb(path.join(__dirname, 'builtin-pages.html'))
    }
    if (request.url.startsWith('beaker:site/'))
      return cb(path.join(__dirname, 'builtin-pages.html'))
    if (request.url == 'beaker:builtin-pages.js')
      return cb(path.join(__dirname, 'builtin-pages.build.js'))
    if (request.url == 'beaker:builtin-pages.css')
      return cb(path.join(__dirname, 'stylesheets/builtin-pages.css'))

    // common assets
    if (request.url == 'beaker:font')
      return cb(path.join(__dirname, 'fonts/photon-entypo.woff'))
    if (request.url.startsWith('beaker:logo'))
      return cb(path.join(__dirname, 'img/logo.png'))

    return cb(-6)
  }, e => {
    if (e)
      console.error('Failed to register beaker protocol', e)
  });
}