import { UserDeniedError } from 'beaker-error-constants'
import * as filesystem from '../../filesystem/index'
import { normalizeOrigin } from '../../../lib/urls'
import * as archivesDb from '../../dbs/archives'
import * as modals from '../../ui/subwindows/modals'
import * as siteSessions from '../../dbs/site-sessions'
import { validateAndNormalizePermissions } from '../../../lib/session-permissions'

// typedefs
// =

/**
 * @typedef {import('../../dbs/site-sessions').UserSiteSession} UserSiteSession
 * @typedef {import('../../dbs/archives').LibraryArchiveMeta} LibraryArchiveMeta
 * 
 * @typedef {Object} User
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 *
 * @typedef {Object} SessionPublicAPIRecord
 * @prop {User} user
 * @prop {Object} permissions
 * 
 * @typedef {Object} FilePerm
 * @prop {String} prefix
 * @prop {String} extension
 * @prop {String} [access]
 */

// exported api
// =

export default {
  /**
   * @param {Object} [opts]
   * @param {Object} [opts.permissions]
   * @param {Array<FilePerm>} [opts.permissions.publicFiles]
   * @param {Array<FilePerm>} [opts.permissions.privateFiles]
   * @returns {Promise<SessionPublicAPIRecord>}
   */
  async request (opts = {}) {
    var siteOrigin = normalizeOrigin(this.sender.getURL())
    if (!opts || typeof opts !== 'object') {
      throw new Error('First argument must be an object')
    }
    if (opts.permissions) {
      validateAndNormalizePermissions(opts.permissions)
    }
    var user = await filesystem.getProfile()

    // run modal
    try {
      await modals.create(this.sender, 'create-session', {user, permissions: opts.permissions})
    } catch (e) {
      throw new UserDeniedError()
    }

    // create the session
    var session = await siteSessions.create(siteOrigin, user.url, opts.permissions)
    return massageSessionRecord(session, user)
  },

  /**
   * @returns {Promise<SessionPublicAPIRecord>}
   */
  async get () {
    var session = await siteSessions.get(normalizeOrigin(this.sender.getURL()))
    if (session) return massageSessionRecord(session, await fetchUserInfo(session.userUrl))
  },

  /**
   * @returns {Promise<void>}
   */
  async destroy () {
    await siteSessions.destroy(normalizeOrigin(this.sender.getURL()))
  }
}

// internal methods
// =

/**
 * @param {UserSiteSession} session
 * @param {User} user
 * @returns {SessionPublicAPIRecord}
 */
function massageSessionRecord (session, user) {
  if (!user) return undefined
  return {
    user: {
      url: user.url,
      title: user.title,
      description: user.description
    },
    permissions: session.permissions
  }
}

/**
 * 
 * @param {string|LibraryArchiveMeta} urlOrDriveMeta 
 * @returns {Promise<User>}
 */
async function fetchUserInfo (urlOrDriveMeta) {
  var userMeta
  if (typeof urlOrDriveMeta === 'string') {
    userMeta = await archivesDb.getMeta(urlOrDriveMeta)
  } else {
    userMeta = urlOrDriveMeta
  }
  return {
    url: userMeta.url,
    title: userMeta.title,
    description: userMeta.description,
  }
}
