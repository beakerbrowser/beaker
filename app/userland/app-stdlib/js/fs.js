import { isFilenameBinary } from './is-ext-binary.js'
import { joinPath, slugify } from './strings.js'

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
 * @typedef {Object} FSQueryResult
 * @prop {string} type
 * @prop {string} path
 * @prop {string} url
 * @prop {Stat} stat
 * @prop {string} drive
 * @prop {string} [mount]
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
  for (let file of files) {
    if (isFilenameBinary(file.path)) continue
    file.content = await navigator.filesystem.readFile(file.path, 'utf8').catch(err => undefined)
    if (file.path.endsWith('.json')) {
      try {
        file.content = JSON.parse(file.content)
      } catch (e) {
        // ignore
      }
    }
  }
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
    let key = await Hyperdrive.resolveName(url)
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
    console.error('Filesystem failed to mount drive', {path, url, error: e})
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
    console.error('Filesystem failed to unmount drive', {path, error: e})
  }
}

/**
 * @param {string} pathSelector 
 * @param {string} url
 * @param {Object} [drive]
 * @return {Promise<void>}
 */
export async function ensureUnmountByUrl (pathSelector, url, drive = navigator.filesystem) {
  try {
    let mounts = await drive.query({
      path: pathSelector,
      mount: url
    })
    if (mounts[0]) {
      // remove mount
      await drive.unmount(mounts[0].path)
    } else {
      throw "Mount not found"
    }
  } catch (e) {
    console.error('Filesystem failed to unmount drive', {pathSelector, url, error: e})
  }
}

/**
 * @param {string} containingPath
 * @param {string} title
 * @param {Object} fs
 * @param {string} ext
 * @returns {Promise<string>}
 */
export async function getAvailableName (containingPath, title, fs = navigator.filesystem, ext = '') {
  var basename = slugify((title || '').trim() || 'untitled').toLowerCase()
  for (let i = 1; i < 1e9; i++) {
    let name = ((i === 1) ? basename : `${basename}-${i}`) + (ext ? `.${ext}` : '')
    let st = await fs.stat(joinPath(containingPath, name), fs).catch(e => null)
    if (!st) return name
  }
  // yikes if this happens
  throw new Error('Unable to find an available name for ' + title)
}
