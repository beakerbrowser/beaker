/**
 * beaker-favicon:
 *
 * Helper protocol to serve site favicons from the sitedata db.
 **/

import { protocol } from 'electron'
import fs from 'fs'
import path from 'path'
import * as sitedata from '../dbs/sitedata'

export function setup () {
  // load default favicon
  var defaultFaviconBuffer = -6 // not found, till we load it
  fs.readFile(path.join(__dirname, './assets/img/default-favicon.ico'), (err, buf) => {
    if (err) { console.error('Failed to load default favicon', path.join(__dirname, './assets/img/default-favicon.ico'), err) }
    if (buf) { defaultFaviconBuffer = buf }
  })

  // register favicon protocol
  protocol.registerBufferProtocol('beaker-favicon', (request, cb) => {
    var url = request.url.slice('beaker-favicon:'.length)

    // look up in db
    sitedata.get(url, 'favicon').then(data => {
      if (data) {
        // `data` is a data url ('data:image/png;base64,...')
        // so, skip the beginning and pull out the data
        data = data.split(',')[1]
        if (data) { return cb({ mimeType: 'image/png', data: Buffer.from(data, 'base64') }) }
      }
      cb({ mimeType: 'image/png', data: defaultFaviconBuffer })
    }).catch(() => cb({ mimeType: 'image/png', data: defaultFaviconBuffer }))
  }, e => {
    if (e) { console.error('Failed to register beaker-favicon protocol', e) }
  })
}
