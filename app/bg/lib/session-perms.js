import globals from '../globals'
import * as users from '../filesystem/users'
import * as userSiteSessions from '../filesystem/site-sessions'
import * as datArchives from '../dat/archives'
import { ucfirst } from '../../lib/strings'
import * as archivesDb from '../dbs/archives'
import { PermissionsError } from 'beaker-error-constants'
import libTools from '@beaker/library-tools'

// typedefs
// =

/**
 * @typedef {import('../filesystem/site-sessions').UserSiteSession} UserSiteSession
 */

// exported api
// =

export async function getSessionUserId (sender) {
  var userSession = globals.userSessionAPI.getFor(sender)
  if (!userSession) throw new Error('No active user session')
  return (await users.get(userSession.url)).id
}

export async function getSessionUserArchive (sender) {
  var userSession = globals.userSessionAPI.getFor(sender)
  if (!userSession) throw new Error('No active user session')
  var key = await datArchives.fromURLToKey(userSession.url, true)
  return datArchives.getArchive(key)
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function toDatOrigin (url) {
  if (!url.startsWith('dat://')) throw new Error('Can only create sessions with dat sites')
  return datArchives.getPrimaryUrl(url)
}

/**
 * @param {Object} sender
 * @returns {Promise<UserSiteSession>}
 */
export async function getSessionOrThrow (sender) {
  if (await isTrustedApp(sender)) return
  var userId = await getSessionUserId(sender)
  var session = await userSiteSessions.get(userId, await toDatOrigin(sender.getURL()))
  if (!session) {
    throw new PermissionsError()
  }
  return session
}

/**
 * @param {Object} sender
 * @param {string} perm eg 'unwalled.garden/api/comments'
 * @param {string} cap eg 'read' or 'write'
 * @returns {Promise<void>}
 */
export async function assertCan (sender, perm, cap) {
  if (await isTrustedApp(sender)) return
  var sess = await getSessionOrThrow(sender)
  if (!(await can(sess, perm, cap))) {
    throw new PermissionsError()
  }
}

/**
 * @param {Object} perms
 */
export function normalizePerms (perms) {
  for (let permId in perms) {
    if (!getPermIcon(permId)) {
      delete perms[permId]
    }
  }
}

/**
 * @param {string} permId
 * @returns {string}
 */
export function getPermIcon (permId) {
  switch (permId) {
    case 'unwalled.garden/api/follows':
      return 'fas fa-rss'
    case 'unwalled.garden/api/statuses':
      return `far fa-comment-alt`
    case 'unwalled.garden/api/bookmarks':
      return `far fa-star`
    case 'unwalled.garden/api/comments':
      return `far fa-comments`
    case 'unwalled.garden/api/reactions':
      return `far fa-smile`
    case 'unwalled.garden/api/votes':
      return `fas fa-vote-yea`
    case 'unwalled.garden/api/library':
      return `fas fa-book`
  }
  return ''
}

/**
 * @param {string} permId
 * @param {string[]} caps
 * @returns {string}
 */
export function describePerm (permId, caps) {
  switch (permId) {
    case 'unwalled.garden/api/follows':
      return 'Follows'
    case 'unwalled.garden/api/statuses':
      return `Status updates`
    case 'unwalled.garden/api/bookmarks':
      return `Bookmarks`
    case 'unwalled.garden/api/comments':
      return `Comments`
    case 'unwalled.garden/api/reactions':
      return `Reactions`
    case 'unwalled.garden/api/votes':
      return `Votes`
    case 'unwalled.garden/api/library':
      return `Dat library`
  }
  return ''
}

/**
 * @param {Object} sender
 * @returns {Promise<boolean>}
 */
export async function isTrustedApp (sender) {
  if (sender.getURL().startsWith('beaker://')) return true
  return senderHasViewerApp(sender)
}

// internal methods
// =

/**
 * @param {Object} sender
 * @returns {Promise<boolean>}
 */
async function senderHasViewerApp (sender) {
  var url = sender.getURL()
  var hasViewerApp = false
  if (url.startsWith('dat://')) {
    let meta = await archivesDb.getMeta(url, {noDefault: true})
    if (meta) {
      let category = libTools.typeToCategory(meta.type, false)
      hasViewerApp = !category || category !== 'website'
    }
  }
  return hasViewerApp
}

/**
 * @param {UserSiteSession} sess
 * @param {string} perm eg 'unwalled.garden/api/comments'
 * @param {string} cap eg 'read' or 'write'
 * @returns {boolean}
 */
function can (sess, perm, cap) {
  if (cap === 'read') return true // read permissions are all allowed, at this stage, if a session exists
  return (sess.permissions[perm] || []).includes(cap)
}