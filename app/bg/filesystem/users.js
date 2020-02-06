import Events from 'events'
import * as logLib from '../logger'
const logger = logLib.child({category: 'filesystem', subcategory: 'users'})
import hyper from '../hyper/index'
import * as filesystem from './index'
import * as db from '../dbs/profile-data-db'
import * as archivesDb from '../dbs/archives'
import { PATHS } from '../../lib/const'

// typedefs
// =

/**
 * @typedef {import('../dat/daemon').DaemonHyperdrive} DaemonHyperdrive
 *
 * @typedef {Object} User
 * @prop {number} id
 * @prop {string} url
 * @prop {DaemonHyperdrive} drive
 * @prop {boolean} isTemporary
 * @prop {string} title
 * @prop {string} description
 * @prop {string} type
 * @prop {Date} createdAt
 */

// globals
// =

var events = new Events()
var users = []

// exported api
// =

export const on = events.on.bind(events)

export const addListener = events.addListener.bind(events)
export const removeListener = events.removeListener.bind(events)

/**
 * @returns {Promise<User[]>}
 */
export async function setup () {
  // load the current users
  users = await db.all(`SELECT * FROM users`)
  await Promise.all(users.map(async (user) => {
    // old temporary?
    if (user.isTemporary) {
      // delete old temporary user
      logger.info('Deleting temporary user', {details: user.url})
      user.isInvalid = true // let invalid-user-deletion clean up the record
      let key = hyper.drives.fromURLToKey(user.url)
      let drive = await hyper.drives.getOrLoadDrive(key)
      return
    }

    // massage data
    user.url = normalizeUrl(user.url)
    user.drive = null
    user.createdAt = new Date(user.createdAt)
    logger.info('Loading user', {details: {url: user.url}})

    // validate
    try {
      await validateUserUrl(user.url)
    } catch (e) {
      user.isInvalid = true
      return
    }

    // fetch the user drive
    try {
      user.drive = await hyper.drives.getOrLoadDrive(user.url)
      user.url = user.drive.url // copy the drive url, which includes the domain if set
      events.emit('load-user', user)
    } catch (err) {
      logger.error('Failed to load user', {details: {user, err}})
    }
  }))

  // remove any invalid users
  var invalids = users.filter(user => user.isInvalid)
  users = users.filter(user => !user.isInvalid)
  invalids.forEach(async (invalidUser) => {
    await db.run(`DELETE FROM users WHERE url = ?`, [invalidUser.url])
  })

  return users
}

/**
 * @returns {Promise<User[]>}
 */
export async function list () {
  return Promise.all(users.map(fetchUserInfo))
}

/**
 * @returns {string[]}
 */
export function listUrls () {
  return users.map(u => u.url)
}

/**
 * @param {string} url
 * @return {Promise<User>}
 */
export async function get (url) {
  url = normalizeUrl(url)
  var user = users.find(user => user.url === url)
  if (!user) return null
  return fetchUserInfo(user)
}

/**
 * @param {string} url
 * @param {boolean} [isTemporary=false]
 * @returns {Promise<User>}
 */
export async function add (url, isTemporary = false) {
  // validate
  await validateUserUrl(url)

  // make sure the user URL doesnt already exist
  url = normalizeUrl(url)
  var existingUser = users.find(user => user.url === url)
  if (existingUser) throw new Error('User already exists at that URL')

  // create the new user
  var user = /** @type User */({
    url,
    drive: null,
    isTemporary,
    createdAt: new Date()
  })
  logger.verbose('Adding user', {details: user.url})
  var dbres = await db.run(
    `INSERT INTO users (url, isTemporary, createdAt) VALUES (?, ?, ?, ?)`,
    [user.url, Number(user.isTemporary), Number(user.createdAt)]
  )
  user.id = dbres.lastID
  users.push(user)

  // fetch the user drive
  user.drive = await hyper.drives.getOrLoadDrive(user.url)
  user.url = user.drive.url // copy the drive url, which includes the domain if set
  events.emit('load-user', user)

  return fetchUserInfo(user)
};

/**
 * @param {string} url
 * @param {Object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.description]
 * @returns {Promise<User>}
 */
export async function edit (url, opts) {
  // validate
  await validateUserUrl(url)

  url = normalizeUrl(url)
  var user = users.find(user => user.url === url)
  if (!user) throw new Error('User does not exist at that URL')

  // update the user
  if (opts.title) user.title = opts.title
  if (opts.description) user.description = opts.title
  logger.verbose('Updated user', {details: user.url})

  // fetch the user drive
  user.drive = await hyper.drives.getOrLoadDrive(user.url)
  user.url = user.drive.url // copy the drive url, which includes the domain if set
  return fetchUserInfo(user)
};

/**
 * @param {string} url
 * @returns {Promise<void>}
 */
export async function remove (url) {
  url = normalizeUrl(url)
  // get the user
  var user = await get(url)
  if (!user) return

  // remove the user
  logger.verbose('Removing user', {details: user.url})
  users.splice(users.indexOf(user), 1)
  await db.run(`DELETE FROM users WHERE url = ?`, [user.url])
  events.emit('unload-user', user)
};

/**
 * @param {string} url
 * @return {boolean}
 */
export function isUser (url) {
  url = normalizeUrl(url)
  return !!users.find(user => user.url === url)
}

// internal methods
// =

/**
 * @param {Object} user
 * @returns {Promise<User>}
 */
async function fetchUserInfo (user) {
  await user.drive.pullLatestDriveMeta()
  var meta = await archivesDb.getMeta(user.drive.key)
  return {
    id: user.id,
    url: user.drive.url,
    drive: user.drive,
    isTemporary: user.isTemporary,
    title: meta.title,
    description: meta.description,
    type: meta.type,
    createdAt: new Date(user.createdAt)
  }
}

/**
 * @param {string} url
 * @returns {string}
 */
function normalizeUrl (url) {
  return url ? url.replace(/(\/)$/, '') : url
}

/**
 * @param {string} url
 * @returns {Promise<void>}
 */
async function validateUserUrl (url) {
  // make sure the drive is saved and that we own the drive
  var urlp = new URL(url)
  var meta = await archivesDb.getMeta(urlp.hostname)
  if (!meta.writable) {
    throw new Error('User drive is not owned by this device')
  }
}
