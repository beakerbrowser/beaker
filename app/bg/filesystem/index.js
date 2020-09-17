import { BrowserWindow } from 'electron'
import { join as joinPath } from 'path'
import * as logLib from '../logger'
const logger = logLib.get().child({category: 'hyper', subcategory: 'filesystem'})
import hyper from '../hyper/index'
import * as db from '../dbs/profile-data-db'
import { promises as fsp } from 'fs'
import * as archivesDb from '../dbs/archives'
import * as bookmarks from './bookmarks'
import * as trash from './trash'
import * as modals from '../ui/subwindows/modals'
import lock from '../../lib/lock'
import { isSameOrigin } from '../../lib/urls'

// typedefs
// =

/**
 * @typedef {import('../hyper/daemon').DaemonHyperdrive} DaemonHyperdrive
 * @typedef {import('../dbs/archives').LibraryArchiveMeta} LibraryArchiveMeta
 * 
 * @typedef {Object} DriveConfig
 * @property {string} key
 * @property {Object} [forkOf]
 * @property {string} [forkOf.key]
 * @property {string} [forkOf.label]
 * 
 * @typedef {Object} DriveIdent
 * @property {boolean} internal
 * @property {boolean} system
 * @property {boolean} profile
 * @property {boolean?} contact
 */

// globals
// =

var browsingProfile
var rootDrive
var profileDriveUrl
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
  return isSameOrigin(url, browsingProfile.url) || isSameOrigin(url, 'hyper://private/')
}

/**
 * @returns {String}
 */
export function getProfileUrl () {
  return profileDriveUrl
}

/**
 * @returns {Promise<DaemonHyperdrive>}
 */
export function getProfileDrive () {
  return hyper.drives.getOrLoadDrive(profileDriveUrl)
}

/**
 * @returns {Promise<void>}
 */
export async function setup () {
  trash.setup()

  // create the root drive as needed
  var isInitialCreation = false
  browsingProfile = await db.get(`SELECT * FROM profiles WHERE id = 0`)
  if (!browsingProfile.url || (typeof browsingProfile.url === 'string' && browsingProfile.url.startsWith('dat:'))) {
    let drive = await hyper.drives.createNewRootDrive()
    logger.info('Root drive created', {url: drive.url})
    await db.run(`UPDATE profiles SET url = ? WHERE id = 0`, [drive.url])
    browsingProfile.url = drive.url
    isInitialCreation = true
  }
  if (!browsingProfile.url.endsWith('/')) browsingProfile.url += '/'

  // load root drive
  logger.info('Loading root drive', {url: browsingProfile.url})
  hyper.dns.setLocal('private', browsingProfile.url)
  rootDrive = await hyper.drives.getOrLoadDrive(browsingProfile.url, {persistSession: true})
  
  // load drive config
  let profileObj = await getProfile()
  let hostKeys = []
  if (profileObj) {
    hostKeys.push(profileObj.key)
    profileDriveUrl = `hyper://${profileObj.key}/`
  }
  try {
    drives = JSON.parse(await rootDrive.pda.readFile('/drives.json')).drives
    hostKeys = hostKeys.concat(drives.map(drive => drive.key))
  } catch (e) {
    if (e.name !== 'NotFoundError') {
      logger.info('Error while reading the drive configuration at /drives.json', {error: e.toString()})
    }
  }
  hyper.drives.ensureHosting(hostKeys)
}

/**
 * @param {string} url 
 * @param {boolean} [includeContacts]
 * @returns {DriveIdent | Promise<DriveIdent>}
 */
export function getDriveIdent (url, includeContacts = false) {
  var system = isRootUrl(url)
  var profile = isSameOrigin(url, profileDriveUrl)
  if (!system && includeContacts) {
    return getAddressBook().then(addressBook => {
      var key = /[0-9a-f]{64}/.exec(url)[0]
      var contact = !!addressBook.contacts.find(c => c.key === key)
      return {system, profile, internal: system || profile, contact}
    })
  }
  return {system, profile, internal: system || profile, contact: undefined}
}

/**
 * @param {Object} [opts]
 * @param {boolean} [opts.includeSystem]
 * @returns {Array<DriveConfig>}
 */
export function listDrives ({includeSystem} = {includeSystem: false}) {
  var d = drives.slice()
  if (includeSystem) {
    d.unshift({key: 'private'})
  }
  return d
}

/**
 * @returns {Promise<Array<LibraryArchiveMeta>>}
 */
export async function listDriveMetas () {
  return Promise.all(drives.map(d => archivesDb.getMeta(d.key)))
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
 * @param {Object} [opts.forkOf]
 * @returns {Promise<void>}
 */
export async function configDrive (url, {forkOf} = {forkOf: undefined}) {
  var release = await lock('filesystem:drives')
  try {
    var key = await hyper.drives.fromURLToKey(url, true)
    var driveCfg = drives.find(d => d.key === key)
    if (!driveCfg) {
      let drive = await hyper.drives.getOrLoadDrive(url)
      let manifest = await drive.pda.readManifest().catch(_ => ({}))

      driveCfg = /** @type DriveConfig */({key})
      if (forkOf && typeof forkOf === 'object') {
        driveCfg.forkOf = forkOf
      }

      if (!drive.writable) {
        // announce the drive
        drive.session.drive.configureNetwork({
          announce: true,
          lookup: true
        })
      }

      // for forks, we need to ensure:
      // 1. the drives.json forkOf.key is the same as index.json forkOf value
      // 2. there's a local forkOf.label
      // 3. the parent is saved
      if (manifest.forkOf && typeof manifest.forkOf === 'string') {
        if (!driveCfg.forkOf) driveCfg.forkOf = {key: undefined, label: undefined}
        driveCfg.forkOf.key = await hyper.drives.fromURLToKey(manifest.forkOf, true)
        if (!driveCfg.forkOf.label) {
          let message = 'Choose a label to save this fork under (e.g. "dev" or "bobs-changes")'
          let promptRes = await modals.create(BrowserWindow.getFocusedWindow().webContents, 'prompt', {message}).catch(e => false)
          if (!promptRes || !promptRes.value) return
          driveCfg.forkOf.label = promptRes.value
        }

        let parentDriveCfg = drives.find(d => d.key === driveCfg.forkOf.key)
        if (!parentDriveCfg) {
          drives.push({key: driveCfg.forkOf.key})
        }
      }

      drives.push(driveCfg)
    } else {
      if (typeof forkOf !== 'undefined') {
        if (forkOf && typeof forkOf === 'object') {
          driveCfg.forkOf = forkOf
        } else {
          delete driveCfg.forkOf
        }
      }
    }
    await rootDrive.pda.writeFile('/drives.json', JSON.stringify({drives}, null, 2))
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
    let drive = await hyper.drives.getOrLoadDrive(url)
    if (!drive.writable) {
      // unannounce the drive
      drive.session.drive.configureNetwork({
        announce: false,
        lookup: true
      })
    }
    drives.splice(driveIndex, 1)
    await rootDrive.pda.writeFile('/drives.json', JSON.stringify({drives}, null, 2))
  } finally {
    release()
  }
}

/**
 * @param {string} containingPath
 * @param {string} basename
 * @param {string} [ext]
 * @param {string} [joiningChar]
 * @param {DaemonHyperdrive} [drive]
 * @returns {Promise<string>}
 */
export async function getAvailableName (containingPath, basename, ext = undefined, joiningChar = '-', drive = rootDrive) {
  for (let i = 1; i < 1e9; i++) {
    let name = ((i === 1) ? basename : `${basename}${joiningChar}${i}`) + (ext ? `.${ext}` : '')
    let st = await stat(joinPath(containingPath, name), drive)
    if (!st) return name
  }
  // yikes if this happens
  throw new Error('Unable to find an available name for ' + basename)
}

export async function ensureDir (path, drive = rootDrive) {
  try {
    let st = await stat(path, drive)
    if (!st) {
      logger.info(`Creating directory ${path}`)
      await drive.pda.mkdir(path)
    } else if (!st.isDirectory()) {
      logger.error('Warning! Filesystem expects a folder but an unexpected file exists at this location.', {path})
    }
  } catch (e) {
    logger.error('Filesystem failed to make directory', {path: '' + path, error: e.toString()})
  }
}

export async function setupDefaultProfile ({title, description, thumbBase64, thumbExt}) {
  var drive = await hyper.drives.createNewDrive({title, description})
  if (!thumbBase64) {
    thumbBase64 = await fsp.readFile(joinPath(__dirname, './assets/img/default-user-thumb.jpg'), 'base64')
    thumbExt = 'jpg'
  }
  await drive.pda.writeFile(`/thumb.${thumbExt || 'png'}`, thumbBase64, 'base64')
  await ensureAddressBook(drive.key.toString('hex'))
  profileDriveUrl = drive.url
}

export async function getAddressBook () {
  var addressBook
  try { addressBook = await rootDrive.pda.readFile('/address-book.json').then(JSON.parse) }
  catch (e) { addressBook = {} }
  addressBook.profiles = addressBook.profiles && Array.isArray(addressBook.profiles) ? addressBook.profiles : []
  addressBook.contacts = addressBook.contacts && Array.isArray(addressBook.contacts) ? addressBook.contacts : []
  return addressBook
}

export async function ensureAddressBook (profileKey) {
  var addressBook = await getAddressBook()
  if (!addressBook.profiles.find(p => p.key === profileKey)) {
    addressBook.profiles.push({key: profileKey})
  }
  await rootDrive.pda.writeFile('/address-book.json', JSON.stringify(addressBook, null, 2))
}

export async function getProfile () {
  try {
    var addressBook = await rootDrive.pda.readFile('/address-book.json').then(JSON.parse)
    var profile = addressBook?.profiles?.[0]
    if (profile) {
      let info = await hyper.drives.getDriveInfo(profile.key)
      profile.url = info.url
      profile.title = info.title
      profile.description = info.description
      return profile
    }
  } catch (e) {
    return undefined
  }
}

// internal methods
// =

async function stat (path, drive = rootDrive) {
  try { return await drive.pda.stat(path) }
  catch (e) { return null }
}
