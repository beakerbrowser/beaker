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
 * @typedef {import('./daemon').DaemonHyperdrive} DaemonHyperdrive
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
 * @param {DaemonHyperdrive} drive - site to crawl.
 * @param {string[]?} filenames - which files to check.
 * @returns {Promise<void>}
 */
export async function update (drive, filenames = null) {
  // list target assets
  if (!filenames) {
    filenames = await drive.pda.readdir('/')
  }
  filenames = filenames.filter(v => ASSET_PATH_REGEX.test(v))

  // read and cache each asset
  for (let filename of filenames) {
    try {
      let assetType = extractAssetType(filename)
      var dataUrl = await readAsset(drive, filename)
      await sitedata.set(drive.url, assetType, dataUrl)
      events.emit(`update:${assetType}:${drive.url}`)
    } catch (e) {
      console.log('Failed to update asset', filename, e)
    }
  }
}

/**
 * @description
 * Check the drive history for changes to an asset
 * 
 * @param {DaemonHyperdrive} drive 
 * @param {Number} startVersion 
 * @returns {Promise<Boolean>}
 */
export async function hasUpdates (drive, startVersion = 0) {
  var changes = await drive.pda.diff(startVersion, '/')
  for (let change of changes) {
    if (ASSET_PATH_REGEX.test(change.name)) {
      return true
    }
  }
  return false
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
 * @param {DaemonHyperdrive} drive
 * @param {string} pathname
 * @returns string The asset as a data URL
 */
async function readAsset (drive, pathname) {
  if (pathname.endsWith('.ico')) {
    let data = await drive.pda.readFile(pathname, 'binary')
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
    let data = await drive.pda.readFile(pathname, 'base64')
    return `data:${mime.lookup(pathname)};base64,${data}`
  }
}