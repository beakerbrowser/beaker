/**
 * asset:{type}{-dimension?}:{url}
 *
 * Helper protocol to serve site favicons and avatars from the cache.
 * Examples:
 *
 *  - asset:favicon:hd://beakerbrowser.com
 *  - asset:favicon-32:hd://beakerbrowser.com
 *  - asset:thumb:hd://beakerbrowser.com
 *  - asset:cover:hd://beakerbrowser.com
 **/

import { screen } from 'electron'
import { parseDriveUrl } from '../../lib/urls'
import * as sitedata from '../dbs/sitedata'
import * as filesystem from '../filesystem/index'
import fs from 'fs'
import path from 'path'

const NOT_FOUND = -6 // TODO I dont think this is the right code -prf

var handler

export function setup () {
  var DEFAULTS = {
    favicon: {type: 'image/png', data: NOT_FOUND},
    thumb: {type: 'image/jpeg', data: NOT_FOUND},
    cover: {type: 'image/jpeg', data: NOT_FOUND}
  }

  // load defaults
  fs.readFile(path.join(__dirname, './assets/img/favicons/default.png'), (err, buf) => {
    if (err) { console.error('Failed to load default favicon', path.join(__dirname, './assets/img/default-favicon.png'), err) }
    if (buf) { DEFAULTS.favicon.data = buf }
  })
  fs.readFile(path.join(__dirname, './assets/img/default-user-thumb.jpg'), (err, buf) => {
    if (err) { console.error('Failed to load default thumb', path.join(__dirname, './assets/img/default-thumb.jpg'), err) }
    if (buf) { DEFAULTS.thumb.data = buf }
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
    if (asset !== 'favicon' && asset !== 'thumb' && asset !== 'cover') {
      return cb({data: NOT_FOUND})
    }

    // hardcoded assets
    if (url.startsWith('beaker://')) {
      let name = /beaker:\/\/([^\/]+)/.exec(url)[1]
      return servePng(path.join(__dirname, `./assets/img/favicons/${name}.png`), DEFAULTS[asset], cb)
    }

    try {
      // look up in db
      let data = await sitedata.get(url, asset)
      if (!data && asset === 'thumb') {
        // try fallback to screenshot
        data = await sitedata.get(url, 'screenshot', {dontExtractOrigin: true, normalizeUrl: true})
        if (!data) {
          // try fallback to favicon
          data = await sitedata.get(url, 'favicon')
        }
      }
      if (data) {
        // `data` is a data url ('data:image/png;base64,...')
        // so, skip the beginning and pull out the data
        let parts = data.split(',')
        let mimeType = /data:([^;]+);base64/.exec(parts[0])[1]
        data = parts[1]
        if (data) {
          return cb({ mimeType, data: Buffer.from(data, 'base64') })
        }
      }
    } catch (e) {
      // ignore
      console.log(e)
    }

    // try standard icons
    if (url.startsWith('hd://')) {
      let urlp = parseDriveUrl(url)
      if (filesystem.isRootUrl(`hd://${urlp.host}`) && (!urlp.pathname || urlp.pathname === '/')) {
        return servePng(path.join(__dirname, `./assets/img/favicons/drive.png`), DEFAULTS[asset], cb)
      }
      if (!urlp.pathname || urlp.pathname.endsWith('/')) {
        return servePng(path.join(__dirname, `./assets/img/favicons/folder.png`), DEFAULTS[asset], cb)
      }
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
  return {
    asset: match[1],
    size: (+match[2]) || 16,
    url: match[3]
  }
}

function servePng (p, fallback, cb) {
  return fs.readFile(p, (err, buf) => {
    if (buf) cb({mimeType: 'image/png', data: buf})
    else cb(fallback)
  })
}