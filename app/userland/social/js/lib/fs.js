import { isFilenameBinary } from './is-ext-binary.js'
import { joinPath, slugify } from './strings.js'
import { chunkMapAsync } from './functions.js'

// typedefs
// =

/**
 * @typedef {Object} FSQueryOpts
 * @prop {string|string[]} path
 * @prop {string} [type]
 * @prop {string} [mount]
 * @prop {Object} [meta]
 * @prop {string} [sort] - 'name', 'ctime', 'mtime'
 * @prop {boolean} [reverse]
 * @prop {number} [limit]
 * @prop {number} [offset]
 *
 * @typedef {Object} Stat
 * @prop {number} mode
 * @prop {number} size
 * @prop {number} offset
 * @prop {number} blocks
 * @prop {Date} atime
 * @prop {Date} mtime
 * @prop {Date} ctime
 * @prop {Object} [mount]
 * @prop {string} [mount.key]
 * @prop {string} linkname
 *
 * @typedef {Object} DriveInfo
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 * @prop {string} type
 * @prop {string} author
 *
 * @typedef {Object} FSQueryResult
 * @prop {string} type
 * @prop {string} path
 * @prop {string} url
 * @prop {Stat} stat
 * @prop {DriveInfo} drive
 * @prop {DriveInfo} [mount]
 * @prop {any} [content]
 */

// exported
// =

/**
 * @param {FSQueryOpts} query
 * @returns {Promise<FSQueryResult[]>}
 */
export async function queryRead (query) {
  var files = await navigator.filesystem.query(query)
  await chunkMapAsync(files, 10, async (file) => {
    if (isFilenameBinary(file.path)) return
    file.content = await navigator.filesystem.readFile(file.path, 'utf8').catch(err => undefined)
    if (file.path.endsWith('.json')) {
      try {
        file.content = JSON.parse(file.content)
      } catch (e) {
        // ignore
      }
    }
  })
  return files
}

/**
 * @param {FSQueryOpts} query
 * @returns {Promise<boolean>}
 */
export async function queryHas (query) {
  var files = await navigator.filesystem.query(query)
  return files.length > 0
}

/**
 * @param {string} path
 */
export async function ensureDir (path) {
  try {
    let st = await navigator.filesystem.stat(path).catch(e => null)
    if (!st) {
      await navigator.filesystem.mkdir(path)
    } else if (!st.isDirectory()) {
      console.error('Warning! Filesystem expects a folder but an unexpected file exists at this location.', {path})
    }
  } catch (e) {
    console.error('Filesystem failed to make directory', {path, error: e})
  }
}

/**
 * @param {string} path
 */
export async function ensureParentDir (path) {
  return ensureDir(path.split('/').slice(0, -1).join('/'))
}

/**
 * @param {string} path 
 * @param {string} url 
 * @return {Promise<void>}
 */
export async function ensureMount (path, url) {
  try {
    let st = await navigator.filesystem.stat(path).catch(e => null)
    let key = await DatArchive.resolveName(url)
    if (!st) {
      // add mount
      await navigator.filesystem.mount(path, key)
    } else if (st.mount) {
      if (st.mount.key.toString('hex') !== key) {
        // change mount
        await navigator.filesystem.unmount(path)
        await navigator.filesystem.mount(path, key)
      }
    } else {
      console.error('Warning! Filesystem expects a mount but an unexpected file exists at this location.', {path})
    }
  } catch (e) {
    console.error('Filesystem failed to mount archive', {path, url, error: e})
  }
}

/**
 * @param {string} path 
 * @return {Promise<void>}
 */
export async function ensureUnmount (path) {
  try {
    let st = await navigator.filesystem.stat(path).catch(e => null)
    if (st && st.mount) {
      // remove mount
      await navigator.filesystem.unmount(path)
    }
  } catch (e) {
    console.error('Filesystem failed to unmount archive', {path, error: e})
  }
}

/**
 * @param {string} containingPath
 * @param {string} title
 * @param {Object} fs
 * @returns {Promise<string>}
 */
export async function getAvailableName (containingPath, title, fs = navigator.filesystem) {
  var basename = slugify((title || '').trim() || 'untitled').toLowerCase()
  for (let i = 1; i < 1e9; i++) {
    let name = (i === 1) ? basename : `${basename}-${i}`
    let st = await fs.stat(joinPath(containingPath, name), fs).catch(e => null)
    if (!st) return name
  }
  // yikes if this happens
  throw new Error('Unable to find an available name for ' + title)
}
