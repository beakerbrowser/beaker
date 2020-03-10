import { isFilenameBinary } from './is-ext-binary.js'
import { urlToKey, joinPath, slugify } from './strings.js'
import { chunkMapAsync } from './functions.js'

// typedefs
// =

/**
 * @typedef {Object} FSQueryOpts
 * @prop {string|string[]} path
 * @prop {string} [type]
 * @prop {string} [mount]
 * @prop {Object} [metadata]
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
 * @prop {Object} metadata
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
 * @param {Hyperdrive} [drive]
 * @returns {Promise<FSQueryResult[]>}
 */
export async function queryRead (query, drive = navigator.filesystem) {
  var files = await drive.query(query)
  await chunkMapAsync(files, 10, async (file) => {
    if (isFilenameBinary(file.path)) return
    file.content = await drive.readFile(file.path, 'utf8').catch(err => undefined)
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
 * @param {Hyperdrive} [drive]
 * @returns {Promise<boolean>}
 */
export async function queryHas (query, drive = navigator.filesystem) {
  var files = await drive.query(query)
  return files.length > 0
}

/**
 * @param {string} path
 * @param {Object} [drive]
 */
export async function ensureDir (path, drive = navigator.filesystem) {
  try {
    let st = await drive.stat(path).catch(e => null)
    if (!st) {
      await drive.mkdir(path)
    } else if (!st.isDirectory()) {
      console.error('Warning! Filesystem expects a folder but an unexpected file exists at this location.', {path})
    }
  } catch (e) {
    console.error('Filesystem failed to make directory', {path, error: e})
  }
}

/**
 * @param {string} path
 * @param {Object} [drive]
 */
export async function ensureParentDir (path, drive = navigator.filesystem) {
  var acc = []
  for (let part of path.split('/').slice(0, -1)) {
    acc.push(part)
    await ensureDir(acc.join('/'), drive)
  }
}

/**
 * @param {string} path 
 * @param {string} url 
 * @param {Object} [drive]
 * @return {Promise<void>}
 */
export async function ensureMount (path, url, drive = navigator.filesystem) {
  try {
    let st = await drive.stat(path).catch(e => null)
    let key = urlToKey(url)
    if (!st) {
      // add mount
      await drive.mount(path, key)
    } else if (st.mount) {
      if (st.mount.key !== key) {
        // change mount
        await drive.unmount(path)
        await drive.mount(path, key)
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
 * @param {Object} [drive]
 * @return {Promise<void>}
 */
export async function ensureUnmount (path, drive = navigator.filesystem) {
  try {
    let st = await drive.stat(path).catch(e => null)
    if (st && st.mount) {
      // remove mount
      await drive.unmount(path)
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
      type: 'mount'
    })
    let mount = mounts.find(item => item.mount === url)
    if (mount) {
      // remove mount
      await drive.unmount(mount.path)
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
 * @param {Object} [drive]
 * @returns {Promise<string>}
 */
export async function getAvailableName (containingPath, title, drive = navigator.filesystem) {
  var basename = slugify((title || '').trim() || 'untitled').toLowerCase()
  for (let i = 1; i < 1e9; i++) {
    let name = (i === 1) ? basename : `${basename}-${i}`
    let st = await drive.stat(joinPath(containingPath, name)).catch(e => null)
    if (!st) return name
  }
  // yikes if this happens
  throw new Error('Unable to find an available name for ' + title)
}
