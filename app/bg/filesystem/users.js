import assert from 'assert'
import Events from 'events'
import * as logLib from '../logger'
const logger = logLib.child({category: 'filesystem', subcategory: 'users'})
import dat from '../dat/index'
import * as filesystem from './index'
import * as db from '../dbs/profile-data-db'
import * as archivesDb from '../dbs/archives'
import { PATHS } from '../../lib/const'

// constants
// =

const LABEL_REGEX = /[a-z0-9-]/i

// typedefs
// =

/**
 * @typedef {import('../dat/daemon').DaemonDatArchive} DaemonDatArchive
 *
 * @typedef {Object} User
 * @prop {number} id
 * @prop {string} label
 * @prop {string} url
 * @prop {DaemonDatArchive} archive
 * @prop {boolean} isDefault
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
      let key = dat.archives.fromURLToKey(user.url)
      let archive = await dat.archives.getOrLoadArchive(key)
      return
    }

    // massage data
    user.url = normalizeUrl(user.url)
    user.archive = null
    user.isDefault = Boolean(user.isDefault)
    user.createdAt = new Date(user.createdAt)
    logger.info('Loading user', {details: {url: user.url}})

    // validate
    try {
      await validateUserUrl(user.url)
    } catch (e) {
      user.isInvalid = true
      return
    }

    // fetch the user archive
    try {
      user.archive = await dat.archives.getOrLoadArchive(user.url)
      user.url = user.archive.url // copy the archive url, which includes the domain if set
      events.emit('load-user', user)
    } catch (err) {
      logger.error('Failed to load user', {details: {user, err}})
    }

    // ensure file structure
    await ensureDirectory(user, PATHS.DATA)
    await ensureDirectory(user, PATHS.DATA_NS('annotations'))
    await ensureDirectory(user, PATHS.DATA_NS('comments'))
    await ensureDirectory(user, PATHS.FEED)
    await ensureDirectory(user, PATHS.FRIENDS)
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
 * @param {string} label
 * @return {Promise<User>}
 */
export async function getByLabel (label) {
  var user = users.find(user => user.label === label)
  if (!user) return null
  return fetchUserInfo(user)
}

/**
 * @return {Promise<User>}
 */
export async function getDefault () {
  var user = users.find(user => user.isDefault === true)
  if (!user) return null
  return fetchUserInfo(user)
}

/**
 * @return {string}
 */
export function getDefaultUrl () {
  var user = users.find(user => user.isDefault === true)
  if (!user) return null
  return user.url
}

/**
 * @param {string} label
 * @param {string} url
 * @param {boolean} [setDefault=false]
 * @param {boolean} [isTemporary=false]
 * @returns {Promise<User>}
 */
export async function add (label, url, setDefault = false, isTemporary = false) {
  // validate
  validateUserLabel(label)
  await validateUserUrl(url)

  // make sure the user label or URL doesnt already exist
  url = normalizeUrl(url)
  var existingUser = users.find(user => user.url === url)
  if (existingUser) throw new Error('User already exists at that URL')
  existingUser = users.find(user => user.label === label)
  if (existingUser) throw new Error('User already exists at that label')

  // create the new user
  var user = /** @type User */({
    label,
    url,
    archive: null,
    isDefault: setDefault || users.length === 0,
    isTemporary,
    createdAt: new Date()
  })
  logger.verbose('Adding user', {details: user.url})
  await db.run(
    `INSERT INTO users (label, url, isDefault, isTemporary, createdAt) VALUES (?, ?, ?, ?, ?)`,
    [user.label, user.url, Number(user.isDefault), Number(user.isTemporary), Number(user.createdAt)]
  )
  users.push(user)
  await filesystem.addUser(user)

  // fetch the user archive
  user.archive = await dat.archives.getOrLoadArchive(user.url)
  user.url = user.archive.url // copy the archive url, which includes the domain if set
  events.emit('load-user', user)
  return fetchUserInfo(user)
};

/**
 * @param {string} url
 * @param {Object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.description]
 * @param {string} [opts.label]
 * @param {boolean} [opts.setDefault]
 * @returns {Promise<User>}
 */
export async function edit (url, opts) {
  // validate
  await validateUserUrl(url)
  if ('label' in opts) validateUserLabel(opts.label)

  // make sure the user label or URL doesnt already exist
  url = normalizeUrl(url)
  var existingUser = users.find(user => user.label === opts.label)
  if (existingUser && existingUser.url !== url) throw new Error('User already exists at that label')

  var user = users.find(user => user.url === url)

  // remove old filesystem mount if the label is changing
  if (opts.label && opts.label !== user.label) {
    await filesystem.removeUser(user)
  }

  // update the user
  if (opts.title) user.title = opts.title
  if (opts.description) user.description = opts.title
  if (opts.setDefault) {
    try { users.find(user => user.isDefault).isDefault = false }
    catch (e) { /* ignore, no existing default */ }
    user.isDefault = true
    await db.run(`UPDATE users SET isDefault = 0 WHERE isDefault = 1`)
    await db.run(`UPDATE users SET isDefault = 1 WHERE url = ?`, [user.url])
  }
  if (opts.label) {
    user.label = opts.label
    await db.run(`UPDATE users SET label = ? WHERE url = ?`, [opts.label, user.url])
  }
  await filesystem.addUser(user)
  logger.verbose('Updated user', {details: user.url})

  // fetch the user archive
  user.archive = await dat.archives.getOrLoadArchive(user.url)
  user.url = user.archive.url // copy the archive url, which includes the domain if set
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
  await filesystem.removeUser(user)
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

/**
 * @param {string} label
 */
export function validateUserLabel (label) {
  assert(label && typeof label === 'string', 'Label must be a non-empty string')
  assert(LABEL_REGEX.test(label), 'Labels can only comprise of letters, numbers, and dashes')
}

// internal methods
// =

/**
 * @param {Object} user
 * @returns {Promise<User>}
 */
async function fetchUserInfo (user) {
  var meta = await archivesDb.getMeta(user.archive.key)
  return {
    id: user.id,
    label: user.label,
    url: user.archive.url,
    archive: user.archive,
    isDefault: user.isDefault,
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
  // make sure the archive is saved and that we own the archive
  var urlp = new URL(url)
  var meta = await archivesDb.getMeta(urlp.hostname)
  if (!meta.writable) {
    throw new Error('User drive is not owned by this device')
  }
}

/**
 * @param {User} user
 * @param {string} pathname
 * @returns {Promise<void>}
 */
async function ensureDirectory (user, pathname) {
  try { await user.archive.pda.mkdir(pathname) }
  catch (e) { /* ignore */ }
}
