import {protocol} from 'electron'
import path from 'path'

export function setup () {
  protocol.registerFileProtocol('beaker-hidden-window', (request, cb) => {
    cb({path: path.join(__dirname, 'hidden-window.html')})
  }, e => {
    if (e) { console.error('Failed to register beaker-hidden-window protocol', e) }
  })
}