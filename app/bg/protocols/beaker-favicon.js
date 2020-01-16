/**
 * beaker-favicon:
 *
 * Helper protocol to serve site favicons from the sitedata db.
 **/

import {protocol, screen} from 'electron'
import dat from '../dat/index'
import * as sitedata from '../dbs/sitedata'
import fs from 'fs'
import path from 'path'
import ICO from 'icojs'

export function setup () {
  // load default favicon
  var defaultFaviconBuffer = -6 // not found, till we load it
  fs.readFile(path.join(__dirname, './assets/img/default-favicon.png'), (err, buf) => {
    if (err) { console.error('Failed to load default favicon', path.join(__dirname, './assets/img/default-favicon.png'), err) }
    if (buf) { defaultFaviconBuffer = buf }
  })

  // detect if is retina
  let display = screen.getPrimaryDisplay()
  const isRetina = display.scaleFactor >= 2

  // register favicon protocol
  protocol.registerBufferProtocol('beaker-favicon', async (request, cb) => {
    // parse the URL
    let {url, faviconSize} = parseBeakerFaviconURL(request.url)
    if (isRetina) {
      faviconSize *= 2
    }

    // if beaker://, pull from assets
    if (url.startsWith('beaker://')) {
      let name = /beaker:\/\/([^\/]+)/.exec(url)[1]
      return fs.readFile(path.join(__dirname, `./assets/img/favicons/${name}.png`), (err, buf) => {
        cb({mimeType: 'image/png', data: buf || defaultFaviconBuffer})
      })
    }

    // if a drive, see if there's a favicon.ico or .png
    try {
      let data, datfs
      // pick the filesystem
      let datResolvedUrl = url
      if (url.startsWith('drive://') || url.startsWith('web://')) {
        datResolvedUrl = await dat.dns.resolveName(url)
        datfs = dat.archives.getArchive(datResolvedUrl) // (only try if the dat is loaded)
      }
      if (datfs) {
        // try .ico
        try {
          data = await datfs.pda.readFile('/favicon.ico', 'binary')
          if (data) {
            // select the best-fitting size
            let images = await ICO.parse(data, 'image/png')
            let image = images[0]
            for (let i = 1; i < images.length; i++) {
              if (Math.abs(images[i].width - faviconSize) < Math.abs(image.width - faviconSize)) {
                image = images[i]
              }
            }
            let buf = Buffer.from(image.buffer)
            return cb({mimeType: 'image/png', data: buf})
          }
        } catch (e) {
          // .ico failed, ignore
          data = null
        }

        try {
          // try .png
          data = await datfs.pda.readFile('/favicon.png', 'binary')
          if (data) {
            return cb({mimeType: 'image/png', data})
          }
        } catch (e) {
          // .png not found, ignore
        }

        // see if there's a dat type we can use
        // TODO restore if/when dat types get involved again
        // let manifest = await datfs.pda.readManifest()
        // let type = getShortenedUnwalledGardenType(manifest.type)
        // if (type) {
        //   return fs.readFile(path.join(__dirname, `./assets/img/templates/${type}.png`), (err, buf) => {
        //     cb({mimeType: 'image/png', data: buf || defaultFaviconBuffer})
        //   })
        // }
      }
    } catch (e) {
      // ignore
      console.error(e)
    }

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

    cb({ mimeType: 'image/png', data: defaultFaviconBuffer })
  }, e => {
    if (e) { console.error('Failed to register beaker-favicon protocol', e) }
  })
}

const BEAKER_FAVICON_URL_RE = /^beaker-favicon:(\d*),?(.*)/
function parseBeakerFaviconURL (str) {
  const match = BEAKER_FAVICON_URL_RE.exec(str)
  let res = {
    faviconSize: (+match[1]) || 16,
    url: match[2]
  }
  return res
}
