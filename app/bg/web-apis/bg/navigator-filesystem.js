import { PermissionsError } from 'beaker-error-constants'
import * as sessionPerms from '../../lib/session-perms'
import * as filesystem from '../../filesystem/index'
import * as datLibrary from '../../filesystem/dat-library'
import * as users from '../../filesystem/users'
import _pick from 'lodash.pick'

// typedefs
// =

/**
 * @typedef {Object} NavigatorFilesystemPublicAPIRootRecord
 * @prop {string} url
 */

/**
 * @typedef {Object} NavigatorFilesystemPublicAPIDriveInfo
 * @prop {boolean} isSystemDrive
 * @prop {boolean} isRoot
 * @prop {boolean} isUser
 * @prop {Object} libraryEntry
 * @prop {boolean} libraryEntry.isSaved
 * @prop {number} libraryEntry.savedAt
 * @prop {boolean} libraryEntry.isHosting
 * @prop {string} libraryEntry.visibility
 */

// exported api
// =

export default {
  /**
   * @returns {Promise<NavigatorFilesystemPublicAPIRootRecord>}
   */
  async get () {
    if (!(await sessionPerms.isTrustedApp(this.sender))) {
      throw new PermissionsError()
    }
    return {
      url: filesystem.get().url
    }
  },

  /**
   * @param {string} url
   * @returns {Promise<NavigatorFilesystemPublicAPIDriveInfo>}
   */
  async identifyDrive (url) {
    if (!(await sessionPerms.isTrustedApp(this.sender))) {
      throw new PermissionsError()
    }
    var libraryEntry = (await datLibrary.list({key: url}))[0]
    var isRoot = url === filesystem.get().url
    var isUser = users.isUser(url)
    return {
      isSystemDrive: isRoot || isUser,
      isRoot,
      isUser,
      libraryEntry: libraryEntry
        ? /** @type Object */(_pick(libraryEntry, ['isSaved', 'savedAt', 'isHosting', 'visibility']))
        : undefined
    }
  }
}
