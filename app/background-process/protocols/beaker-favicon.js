/**
 * beaker-favicon:
 *
 * Helper protocol to serve site favicons from the sitedata db.
 **/

import { protocol } from 'electron'
import fs from 'fs'
import path from 'path'
import pda from 'pauls-dat-api'
import {parse as parseUrl} from 'url'
import * as sitedata from '../dbs/sitedata'
import * as workspacesDb from '../dbs/workspaces'
import * as scopedFSes from '../../lib/bg/scoped-fses'
import * as datLibrary from '../networks/dat/library'
import datDns from '../networks/dat/dns'

export function setup () {
  // load default favicon
  var defaultFaviconBuffer = -6 // not found, till we load it
  fs.readFile(path.join(__dirname, './assets/img/default-favicon.png'), (err, buf) => {
    if (err) { console.error('Failed to load default favicon', path.join(__dirname, './assets/img/default-favicon.png'), err) }
    if (buf) { defaultFaviconBuffer = buf }
  })

  // register favicon protocol
  protocol.registerBufferProtocol('beaker-favicon', async (request, cb) => {
    var url = request.url.slice('beaker-favicon:'.length)

    try {
      // look up in db
      let data = await sitedata.get(url, 'favicon')
      if (data) {
        // `data` is a data url ('data:image/png;base64,...')
        // so, skip the beginning and pull out the data
        data = data.split(',')[1]
        if (data) {
          return cb({ mimeType: 'image/png', data: Buffer.from(data, 'base64') })
        }
      }
    } catch (e) {
      // ignore
    }

    // if a dat or a workspace, see if there's a favicon.png 
    try {
      let data
      if (url.startsWith('dat://')) {
        url = await datDns.resolveName(url)
        let archive = datLibrary.getArchive(url) // (only try if the dat is loaded)
        data = await pda.readFile(archive, '/favicon.png', 'binary')
      } else if (url.startsWith('workspace://')) {
        let urlp = parseUrl(url)
        let wsEntry = await workspacesDb.get(0, urlp.hostname)
        let scopedFS = scopedFSes.get(wsEntry.localFilesPath)
        data = await pda.readFile(scopedFS, '/favicon.png', 'binary')
      }
      if (data) {
        return cb({mimeType: 'image/png', data})
      }
    } catch (e) {
      // ignore
    }

    cb({ mimeType: 'image/png', data: defaultFaviconBuffer })
  }, e => {
    if (e) { console.error('Failed to register beaker-favicon protocol', e) }
  })
}
