import * as userSiteSessions from '../filesystem/site-sessions'
import * as drives from '../hyper/drives'
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

export async function getSessionUserDrive (sender) {
  var userSession = undefined // TODO windows.getUserSessionFor(sender)
  if (!userSession) throw new Error('No active user session')
  var key = await drives.fromURLToKey(userSession.url, true)
  return drives.getDrive(key)
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function toDriveOrigin (url) {
  if (!url.startsWith('hyper://')) {
    throw new Error('Can only create sessions with hyperdrive sites')
  }
  return `hyper://${await drives.fromURLToKey(url, true)}/`
}

/**
 * @param {Object} sender
 * @returns {Promise<UserSiteSession>}
 */
export async function getSessionOrThrow (sender) {
  if (await isTrustedApp(sender)) return
  var userId = undefined // TODO await getSessionUserId(sender)
  var session = await userSiteSessions.get(userId, await toDriveOrigin(sender.getURL()))
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
 * @param {Object} sender
 * @returns {Promise<boolean>}
 */
export async function isTrustedApp (sender) {
  // TEMPORARY: hyperdrive.network is trusted
  if (/^(beaker:|https?:\/\/(.*\.)?hyperdrive\.network(:|\/))/i.test(sender.getURL())) return true
  return true
}

// internal methods
// =

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