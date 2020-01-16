import { join as joinPath } from 'path'
import * as logLib from '../logger'
const logger = logLib.category('filesystem')
import slugify from 'slugify'
import hyper from '../hyper/index'
import * as db from '../dbs/profile-data-db'
import * as users from './users'
import * as trash from './trash'
import { PATHS } from '../../lib/const'

// typedefs
// =

/**
 * @typedef {import('../dat/daemon').DaemonHyperdrive} DaemonHyperdrive
 * @typedef {import('./users').User} User
 */

// globals
// =

var browsingProfile
var rootDrive

// exported api
// =

/**
 * @returns {DaemonHyperdrive}
 */
export function get () {
  return rootDrive
}

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isRootUrl (url) {
  return url === browsingProfile.url
}

/**
 * @returns {Promise<void>}
 */
export async function setup () {
  trash.setup()

  // create the root drive as needed
  browsingProfile = await db.get(`SELECT * FROM profiles WHERE id = 0`)
  if (!browsingProfile.url) {
    let drive = await hyper.drives.createNewRootDrive()
    logger.info('Root drive created', {url: drive.url})
    await db.run(`UPDATE profiles SET url = ? WHERE id = 0`, [drive.url])
    browsingProfile.url = drive.url
  }

  // load root drive
  rootDrive = await hyper.drives.getOrLoadDrive(browsingProfile.url)
  
  // setup users
  var userList = await users.setup()

  // enforce root files structure
  logger.info('Loading root drive', {url: browsingProfile.url})
  try {
    // ensure common dirs
    await ensureDir(PATHS.DESKTOP)
    await ensureDir(PATHS.LIBRARY)
    await ensureDir(PATHS.LIBRARY_NS('bookmarks'))
    await ensureDir(PATHS.LIBRARY_NS('documents'))
    await ensureDir(PATHS.LIBRARY_NS('media'))
    await ensureDir(PATHS.LIBRARY_NS('projects'))
    await ensureDir(PATHS.SYSTEM)
    await ensureDir(PATHS.SYSTEM_NS('drives'))
    await ensureDir(PATHS.SYSTEM_NS('templates'))
    await ensureDir(PATHS.SYSTEM_NS('webterm'))
    await ensureDir(PATHS.SYSTEM_NS('webterm/cmds'))

    // ensure all user mounts are set
    for (let user of userList) {
      if (user.isDefault) {
        await ensureMount(PATHS.DEFAULT_USER, user.url)
      }
    }
  } catch (e) {
    console.error('Error while constructing the root drive', e.toString())
    logger.error('Error while constructing the root drive', {error: e.toString()})
  }
}

/**
 * @param {string} url 
 * @returns {Promise<void>}
 */
export async function setDefaultUser (url) {
  await ensureMount(PATHS.DEFAULT_USER, url)
}

/**
 * @param {string} url
 * @param {string} title
 * @returns {Promise<void>}
 */
export async function addToLibrary (url, title) {
  var name = await getAvailableName(PATHS.SYSTEM_NS('drives'), slugify((title || '').trim() || 'untitled').toLowerCase())
  await ensureMount(joinPath(PATHS.SYSTEM_NS('drives'), name), url)
}

/**
 * @param {string} containingPath
 * @param {string} basename
 * @param {string} ext
 * @returns {Promise<string>}
 */
export async function getAvailableName (containingPath, basename, ext = undefined) {
  for (let i = 1; i < 1e9; i++) {
    let name = ((i === 1) ? basename : `${basename}-${i}`) + (ext ? `.${ext}` : '')
    let st = await stat(joinPath(containingPath, name))
    if (!st) return name
  }
  // yikes if this happens
  throw new Error('Unable to find an available name for ' + basename)
}

// internal methods
// =

async function stat (path) {
  try { return await rootDrive.pda.stat(path) }
  catch (e) { return null }
}

async function ensureDir (path) {
  try {
    let st = await stat(path)
    if (!st) {
      logger.info(`Creating directory ${path}`)
      await rootDrive.pda.mkdir(path)
    } else if (!st.isDirectory()) {
      logger.error('Warning! Filesystem expects a folder but an unexpected file exists at this location.', {path})
    }
  } catch (e) {
    logger.error('Filesystem failed to make directory', {path: '' + path, error: e.toString()})
  }
}

async function ensureMount (path, url) {
  try {
    let st = await stat(path)
    let key = await hyper.drives.fromURLToKey(url, true)
    if (!st) {
      // add mount
      logger.info(`Adding mount ${path}`, {key})
      await rootDrive.pda.mount(path, key)
    } else if (st.mount) {
      if (st.mount.key.toString('hex') !== key) {
        // change mount
        logger.info('Reassigning mount', {path, key, oldKey: st.mount.key.toString('hex')})
        await rootDrive.pda.unmount(path)
        await rootDrive.pda.mount(path, key)
      }
    } else {
      logger.error('Warning! Filesystem expects a mount but an unexpected file exists at this location.', {path})
    }
  } catch (e) {
    logger.error('Filesystem failed to mount drive', {path, url, error: e.toString()})
  }
}

async function ensureUnmount (path) {
  try {
    let st = await stat(path)
    if (st && st.mount) {
      // remove mount
      logger.info('Removing mount', {path})
      await rootDrive.pda.unmount(path)
    }
  } catch (e) {
    logger.error('Filesystem failed to unmount drive', {path, error: e.toString()})
  }
}