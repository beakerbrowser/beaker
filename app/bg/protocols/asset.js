/**
 * asset:{type}{-dimension?}:{url}
 *
 * Helper protocol to serve site favicons and avatars from the cache.
 * Examples:
 *
 *  - asset:favicon:hyper://beakerbrowser.com
 *  - asset:favicon-32:hyper://beakerbrowser.com
 *  - asset:thumb:hyper://beakerbrowser.com
 *  - asset:cover:hyper://beakerbrowser.com
 **/

import { screen, nativeImage } from 'electron'
import * as sitedata from '../dbs/sitedata'
import { capturePage } from '../browser'
import fs from 'fs'
import path from 'path'

const NOT_FOUND = -6 // TODO I dont think this is the right code -prf

var handler
var activeCaptures = {} // [url] => Promise<NativeImage>

export function setup () {
  var DEFAULTS = {
    favicon: {type: 'image/png', data: NOT_FOUND},
    thumb: {type: 'image/jpeg', data: NOT_FOUND},
    cover: {type: 'image/jpeg', data: NOT_FOUND},
    screenshot: {type: 'image/png', data: NOT_FOUND}
  }

  // load defaults
  fs.readFile(path.join(__dirname, './assets/img/favicons/default.png'), (err, buf) => {
    if (err) { console.error('Failed to load default favicon', path.join(__dirname, './assets/img/default-favicon.png'), err) }
    if (buf) { DEFAULTS.favicon.data = buf }
  })
  fs.readFile(path.join(__dirname, './assets/img/default-screenshot.jpg'), (err, buf) => {
    if (err) { console.error('Failed to load default thumb', path.join(__dirname, './assets/img/default-screenshot.jpg'), err) }
    if (buf) {
      DEFAULTS.thumb.data = buf
      DEFAULTS.screenshot.data = buf
    }
  })
  fs.readFile(path.join(__dirname, './assets/img/default-cover.jpg'), (err, buf) => {
    if (err) { console.error('Failed to load default cover', path.join(__dirname, './assets/img/default-cover.jpg'), err) }
    if (buf) { DEFAULTS.cover.data = buf }
  })

  // detect if is retina
  let display = screen.getPrimaryDisplay()
  const isRetina = display.scaleFactor >= 2

  // register favicon protocol
  handler = async (request, cb) => {
    // parse the URL
    let {asset, url, size} = parseAssetUrl(request.url)
    if (isRetina) {
      size *= 2
    }

    // validate
    if (asset !== 'favicon' && asset !== 'thumb' && asset !== 'cover' && asset !== 'screenshot') {
      return cb({data: NOT_FOUND})
    }

    // hardcoded assets
    if (asset !== 'screenshot' && url.startsWith('beaker://')) {
      let name = /beaker:\/\/([^\/]+)/.exec(url)[1]
      return servePng(path.join(__dirname, `./assets/img/favicons/${name}.png`), DEFAULTS[asset], cb)
    }

    try {
      // look up in db
      let data
      if (asset === 'screenshot') {
        data = await sitedata.get(url, 'screenshot', {dontExtractOrigin: true, normalizeUrl: true})
        if (!data && !url.startsWith('dat:')) {
          // try to fetch the screenshot
          let p = activeCaptures[url]
          if (!p) {
            p = activeCaptures[url] = capturePage(url)
          }
          let nativeImg = await p
          delete activeCaptures[url]
          if (nativeImg) {
            data = nativeImg.toDataURL()
            await sitedata.set(url, 'screenshot', data, {dontExtractOrigin: true, normalizeUrl: true})
          } else {
            return serveJpg(path.join(__dirname, `./assets/img/default-screenshot.jpg`), DEFAULTS[asset], cb)
          }
        }
      } else {
        data = await sitedata.get(url, asset)
        if (!data && asset === 'thumb') {
          // try fallback to screenshot
          data = await sitedata.get(url, 'screenshot', {dontExtractOrigin: true, normalizeUrl: true})
          if (!data) {
            // try fallback to favicon
            data = await sitedata.get(url, 'favicon')
          }
        }
        if (!data && asset === 'favicon') {
          // try fallback to thumb
          data = await sitedata.get(url, 'thumb')
        }
      }
      if (data) {
        if (size) {
          let img = nativeImage.createFromDataURL(data)
          data = img.resize({width: size}).toDataURL()
        }
        
        // `data` is a data url ('data:image/png;base64,...')
        // so, skip the beginning and pull out the data
        let parts = data.split(',')
        if (parts[1]) {
          let mimeType = /data:([^;]+);base64/.exec(parts[0])[1]
          data = parts[1]
          if (data) {
            return cb({ mimeType, data: Buffer.from(data, 'base64') })
          }
        }
      }
    } catch (e) {
      // ignore
      console.log(e)
    }

    cb(DEFAULTS[asset])
  }
}

export function register (protocol) {
  protocol.registerBufferProtocol('asset', handler)
}

const ASSET_URL_RE = /^asset:([a-z]+)(-\d+)?:(.*)/
function parseAssetUrl (str) {
  const match = ASSET_URL_RE.exec(str)
  var url
  try {
    let urlp = new URL(match[3])
    url = urlp.protocol + '//' + urlp.hostname + urlp.pathname
  } catch (e) {
    url = match[3]
  }
  return {
    asset: match[1],
    size: Math.abs(Number(match[2])),
    url
  }
}

function servePng (p, fallback, cb) {
  return fs.readFile(p, (err, buf) => {
    if (buf) cb({mimeType: 'image/png', data: buf})
    else cb(fallback)
  })
}

function serveJpg (p, fallback, cb) {
  return fs.readFile(p, (err, buf) => {
    if (buf) cb({mimeType: 'image/jpeg', data: buf})
    else cb(fallback)
  })
}