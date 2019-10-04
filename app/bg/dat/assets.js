import Events from 'events'
import ICO from 'icojs'
import mime from 'mime'
import * as sitedata from '../dbs/sitedata'

// constants
// =

const ASSET_PATH_REGEX = /^\/?(favicon|thumb|cover).(jpg|jpeg|png|ico)$/i
const IDEAL_FAVICON_SIZE = 64

// typedefs
// =

/**
 * @typedef {import('./daemon').DaemonDatArchive} DaemonDatArchive
 */

// globals
// =

var events = new Events()

// exported api
// =

export const on = events.on.bind(events)

export const addListener = events.addListener.bind(events)
export const removeListener = events.removeListener.bind(events)

/**
 * @description
 * Crawl the given site for assets.
 *
 * @param {DaemonDatArchive} archive - site to crawl.
 * @param {string[]?} filenames - which files to check.
 * @returns {Promise<void>}
 */
export const update = async function (archive, filenames = null) {
  // list target assets
  if (!filenames) {
    filenames = await archive.pda.readdir('/')
  }
  filenames = filenames.filter(v => ASSET_PATH_REGEX.test(v))

  // read and cache each asset
  for (let filename of filenames) {
    try {
      let assetType = extractAssetType(filename)
      var dataUrl = await readAsset(archive, filename)
      await sitedata.set(archive.url, assetType, dataUrl)
      events.emit(`update:${assetType}:${archive.url}`)
    } catch (e) {
      console.log('Failed to update asset', filename, e)
    }
  }
}

// internal
// =

/**
 * Extract the asset type from the pathname
 * @param {string} pathname
 * @returns string
 */
function extractAssetType (pathname) {
  if (/cover/.test(pathname)) return 'cover'
  if (/thumb/.test(pathname)) return 'thumb'
  return 'favicon'
}

/**
 * Reads the asset file as a dataurl
 * - Converts any .ico to .png
 * @param {DaemonDatArchive} archive
 * @param {string} pathname
 * @returns string The asset as a data URL
 */
async function readAsset (archive, pathname) {
  if (pathname.endsWith('.ico')) {
    let data = await archive.pda.readFile(pathname, 'binary')
    // select the best-fitting size
    let images = await ICO.parse(data, 'image/png')
    let image = images[0]
    for (let i = 1; i < images.length; i++) {
      if (Math.abs(images[i].width - IDEAL_FAVICON_SIZE) < Math.abs(image.width - IDEAL_FAVICON_SIZE)) {
        image = images[i]
      }
    }
    let buf = Buffer.from(image.buffer)
    return `data:image/png;base64,${buf.toString('base64')}`
  } else {
    let data = await archive.pda.readFile(pathname, 'base64')
    return `data:${mime.lookup(pathname)};base64,${data}`
  }
}