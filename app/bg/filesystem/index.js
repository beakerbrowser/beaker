import { join as joinPath } from 'path'
import * as logLib from '../logger'
const logger = logLib.category('filesystem')
import hyper from '../hyper/index'
import * as db from '../dbs/profile-data-db'
import * as bookmarks from './bookmarks'
import * as users from './users'
import * as trash from './trash'
import { PATHS } from '../../lib/const'
import lock from '../../lib/lock'

// typedefs
// =

/**
 * @typedef {import('../dat/daemon').DaemonHyperdrive} DaemonHyperdrive
 * @typedef {import('./users').User} User
 * 
 * @typedef {Object} DriveConfig
 * @property {string} key
 * @property {boolean} seeding
 * @property {Object} [forkOf]
 * @property {string} [forkOf.key]
 * @property {string} [forkOf.label]
 * 
 * @typedef {Object} DriveIdent
 * @property {boolean} system
 * @property {boolean} user
 * @property {boolean} home
 */

// globals
// =

var browsingProfile
var rootDrive
var drives = []

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
  await users.setup()

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
    await ensureDir(PATHS.PROFILES)
    await ensureDir(PATHS.SYSTEM)

    // default bookmarks
    await bookmarks.add({location: '/desktop', href: `https://hyperdrive.network/${browsingProfile.url.slice('hyper://'.length)}`, title: 'My Home Drive'})
    await bookmarks.add({location: '/desktop', href: 'beaker://library/', title: 'My Library'})

    // ensure all user mounts are set
    // TODO
    // for (let user of userList) {
    // }
  } catch (e) {
    console.error('Error while constructing the root drive', e.toString())
    logger.error('Error while constructing the root drive', {error: e.toString()})
  }

  // load drive config
  try {
    drives = JSON.parse(await rootDrive.pda.readFile(PATHS.SYSTEM_NS('drives.json'))).drives
  } catch (e) {
    console.error('Error while reading the drive configuration at /system/drives.json', e.toString())
    logger.error('Error while reading the drive configuration at /system/drives.json', {error: e.toString()})
  }
}

/**
 * @param {string} url 
 * @returns {DriveIdent}
 */
export function getDriveIdent (url) {
  var home = isRootUrl(url)
  var user = users.isUser(url)
  return {system: home || user, home, user}
}

/**
 * @param {Object} [opts]
 * @param {boolean} [opts.includeSystem]
 * @returns {Array<DriveConfig>}
 */
export function listDrives ({includeSystem} = {includeSystem: false}) {
  var d = drives.slice()
  if (includeSystem) {
    for (let userUrl of users.listUrls()) {
      d.unshift({key: userUrl.slice('hyper://'.length)})
    }
    d.unshift({key: rootDrive.url.slice('hyper://'.length)})
  }
  return d
}

/**
 * @param {string} key
 * @returns {DriveConfig}
 */
export function getDriveConfig (key) {
  return listDrives().find(d => d.key === key)
}

/**
 * @param {string} url
 * @param {Object} [opts]
 * @param {boolean} [opts.seeding]
 * @param {Object} [opts.forkOf]
 * @returns {Promise<void>}
 */
export async function configDrive (url, {seeding, forkOf} = {seeding: undefined, forkOf: undefined}) {
  var release = await lock('filesystem:drives')
  try {
    var key = await hyper.drives.fromURLToKey(url, true)
    var drive = drives.find(drive => drive.key === key)
    if (!drive) {
      if (typeof seeding === 'undefined') {
        seeding = true
      }
      drive = /** @type DriveConfig */({key, seeding})
      if (forkOf && typeof forkOf === 'object') {
        drive.forkOf = forkOf
      }
      drives.push(drive)
    } else {
      if (typeof seeding !== 'undefined') {
        drive.seeding = seeding
      }
      if (typeof forkOf !== 'undefined') {
        if (forkOf && typeof forkOf === 'object') {
          drive.forkOf = forkOf
        } else {
          delete drive.forkOf
        }
      }
    }
    await rootDrive.pda.writeFile(PATHS.SYSTEM_NS('drives.json'), JSON.stringify({drives}, null, 2))
  } finally {
    release()
  }
}

/**
 * @param {string} url
 * @returns {Promise<void>}
 */
export async function removeDrive (url) {
  var release = await lock('filesystem:drives')
  try {
    var key = await hyper.drives.fromURLToKey(url, true)
    var driveIndex = drives.findIndex(drive => drive.key === key)
    if (driveIndex === -1) return
    drives.splice(driveIndex, 1)
    await rootDrive.pda.writeFile(PATHS.SYSTEM_NS('drives.json'), JSON.stringify({drives}, null, 2))
  } finally {
    release()
  }
}

/**
 * @param {string} containingPath
 * @param {string} basename
 * @param {string} [ext]
 * @param {string} [joiningChar]
 * @returns {Promise<string>}
 */
export async function getAvailableName (containingPath, basename, ext = undefined, joiningChar = '-') {
  for (let i = 1; i < 1e9; i++) {
    let name = ((i === 1) ? basename : `${basename}${joiningChar}${i}`) + (ext ? `.${ext}` : '')
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