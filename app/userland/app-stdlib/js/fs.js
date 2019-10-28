import { isFilenameBinary } from './is-ext-binary.js'

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
 * @prop {Object} ident
 * @prop {boolean} ident.isRoot
 * @prop {boolean} ident.isUser
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
    let st = await safeStat(path)
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

// internal
// =

/**
 * @param {string} path
 * @returns {Promise<Object>}
 */
async function safeStat (path) {
  try { return await navigator.filesystem.stat(path) }
  catch (e) { return null }
}