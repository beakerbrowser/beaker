import Events from 'events'
import * as logLib from '../logger'
const logger = logLib.child({category: 'filesystem', subcategory: 'users'})
import * as filesystem from './index'
import { query } from './query'
import * as archivesDb from '../dbs/archives'
import { joinPath } from '../../lib/strings'

// typedefs
// =

/**
 * @typedef {import('../hyper/daemon').DaemonHyperdrive} DaemonHyperdrive
 * @typedef {import('../filesystem/query').FSQueryResult} FSQueryResult
 *
 * @typedef {Object} User
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 * @prop {Object} [group]
 * @prop {string} [group.url]
 * @prop {string} [group.title]
 * @prop {string} [group.description]
 * @prop {boolean} [group.isMember]
 * @prop {string} [group.userid]
 */

// globals
// =

var userUrls = []
var events = new Events()

// exported api
// =

export const on = events.on.bind(events)
export const addListener = events.addListener.bind(events)
export const removeListener = events.removeListener.bind(events)

/**
 * @returns {Promise<void>}
 */
export async function setup () {
  var queryRes = await query(filesystem.get(), {path: '/profiles/*', type: 'mount'})
  userUrls = queryRes.map(res => res.mount)
}

/**
 * @param {Object} [opts]
 * @param {string} [opts.group]
 * @returns {Promise<User[]>}
 */
export async function list ({group} = {group: undefined}) {
  var fs = filesystem.get()
  var res = await query(fs, {path: '/profiles/*', type: 'mount'})
  if (group) {
    let userGroups = {}
    for (let user of res) {
      let st = await fs.pda.stat(joinPath(user.path, 'group')).catch(e => undefined)
      if (st && st.mount.key) userGroups[user.mount] = st.mount.key.toString('hex')
    }
    res = res.filter(user => userGroups[user.mount] === group)
  }
  return Promise.all(res.map(fetchUserInfo))
}

/**
 * @returns {string[]}
 */
export function listUrls () {
  return userUrls.slice()
}

/**
 * @param {string} url
 * @return {Promise<User>}
 */
export async function get (url) {
  url = normalizeUrl(url)
  var user = await query(filesystem.get(), {path: '/profiles/*', mount: url})
  if (!user[0]) return null
  return fetchUserInfo(user[0])
}

/**
 * @param {string} url
 * @param {string} userTitle
 * @param {string} groupTitle
 * @returns {Promise<User>}
 */
export async function add (url, userTitle, groupTitle) {
  await validateUserUrl(url)

  url = normalizeUrl(url)
  var res = await query(filesystem.get(), {path: '/profiles/*', mount: url})
  if (res[0]) throw new Error('User already exists at that URL')

  var mountName = `${groupTitle || 'Unnamed Group'} (${userTitle || 'Anonymous'})`
  mountName = await filesystem.getAvailableName('/profiles', mountName, undefined, ' ')
  var path = joinPath('/profiles/', mountName)

  logger.verbose('Adding user', {details: {url, path}})
  await filesystem.get().pda.mount(path, url)
  userUrls.push(url)

  var res = await query(filesystem.get(), {path: '/profiles/*', mount: url})
  return fetchUserInfo(res[0])
}

/**
 * @param {string} url
 * @returns {Promise<void>}
 */
export async function remove (url) {
  url = normalizeUrl(url)
  
  var res = await query(filesystem.get(), {path: '/profiles/*', mount: url})
  if (!res[0]) return

  logger.verbose('Removing user', {details: {url: res[0].url, path: res[0].path}})
  await filesystem.get().pda.unmount(res[0].path)
  userUrls = userUrls.filter(u2 => u2 !== url)
}

/**
 * @param {string} url
 * @return {boolean}
 */
export function isUser (url) {
  url = normalizeUrl(url)
  return !!userUrls.find(url2 => url2 === url)
}

// internal methods
// =

/**
 * @param {FSQueryResult} userQueryRes
 * @returns {Promise<User>}
 */
async function fetchUserInfo (userQueryRes) {
  const fs = filesystem.get()
  var group = undefined
  var groupStat = await fs.pda.stat(joinPath(userQueryRes.path, '/group')).catch(e => undefined)
  if (groupStat && groupStat.mount.key) {
    let groupInfo = await fs.pda.readFile(joinPath(userQueryRes.path, '/group/index.json')).then(JSON.parse).catch(e => undefined)
    group = {
      url: `hyper://${groupStat.mount.key.toString('hex')}`,
      title: groupInfo ? groupInfo.title : '',
      description: groupInfo ? groupInfo.description : '',
      isMember: false,
      userid: undefined
    }
    let registrationRes = await query(fs, {path: joinPath(userQueryRes.path, '/group/users/*'), mount: userQueryRes.mount})
    if (registrationRes[0]) {
      group.isMember = true
      group.userid = registrationRes[0].path.split('/').pop()
    }
  }
  var meta = await archivesDb.getMeta(userQueryRes.mount)
  return {
    url: userQueryRes.mount,
    title: meta.title,
    description: meta.description,
    group
  }
}

/**
 * @param {string} url
 * @returns {string}
 */
function normalizeUrl (url) {
  if (!url) throw new Error(`Invalid url: "${url}"`)
  if (!url.includes('://')) url = `hyper://${url}`
  let urlp = new URL(url)
  return `hyper://${urlp.hostname}${urlp.pathname}`.replace(/(\/)$/, '')
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
