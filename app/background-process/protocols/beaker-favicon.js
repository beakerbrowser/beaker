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
  fs.readFile(path.join(__dirname, './img/default-favicon.ico'), (err, buf) => {
    if (err)
      console.log('Failed to load default favicon', path.join(__dirname, '../../img/default-favicon.ico'), err)
    if (buf)
      defaultFaviconBuffer = buf
  })

  // load logo favicon
  var logoBuffer = -6 // not found, till we load it
  fs.readFile(path.join(__dirname, './img/logo-favicon.png'), (err, buf) => {
    if (err)
      console.log('Failed to load logo favicon', path.join(__dirname, '../../img/logo.png'), err)
    if (buf)
      logoBuffer = buf
  })

  // register favicon protocol
  protocol.registerBufferProtocol('beaker-favicon', (request, cb) => {
    var url = request.url.slice('beaker-favicon:'.length)

    // special case
    if (url == 'beaker')
      return cb(logoBuffer)

    // look up in db
    sitedata.get(url, 'favicon').then(data => {
      if (data) {
        // `data` is a data url ('data:image/png;base64,...')
        // so, skip the beginning and pull out the data
        data = data.split(',')[1]
        if (data)
          return cb(new Buffer(data, 'base64'))
      }
      cb(defaultFaviconBuffer)
    }).catch(err => cb(defaultFaviconBuffer))
  }, e => {
    if (e)
      console.error('Failed to register beaker-favicon protocol', e)
  });
}