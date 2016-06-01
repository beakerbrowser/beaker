import { protocol } from 'electron'
import path from 'path'

export function setup () {
  protocol.registerFileProtocol('beaker', (request, cb) => {
    if (request.url == 'beaker:start')
      return cb(path.join(__dirname, 'builtin-pages/start.html'))

    // FIXME find a way to properly serve the assets
    if (request.url == 'beaker:start.js')
      return cb(path.join(__dirname, 'builtin-pages/start.js'))
    if (request.url == 'beaker:start.css')
      return cb(path.join(__dirname, 'stylesheets/builtin-pages/start.css'))
    if (request.url == 'beaker:font')
      return cb(path.join(__dirname, 'fonts/photon-entypo.woff'))
    return cb(-6)
  }, e => {
    if (e)
      console.error('Failed to register beaker protocol', e)
  });
}