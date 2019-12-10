import { PermissionsError } from 'beaker-error-constants'
import * as sessionPerms from '../../lib/session-perms'
import * as filesystem from '../../filesystem/index'
import * as users from '../../filesystem/users'
import _pick from 'lodash.pick'

// typedefs
// =

/**
 * @typedef {import('../../filesystem/query').FSQueryOpts} FSQueryOpts
 * @typedef {import('../../filesystem/query').FSQueryResult} FSQueryResult
 *
 * @typedef {Object} NavigatorFilesystemPublicAPIRootRecord
 * @prop {string} url
 *
 * @typedef {Object} NavigatorFilesystemPublicAPIDriveInfo
 * @prop {boolean} isSystemDrive
 * @prop {boolean} isRoot
 * @prop {boolean} isUser
 */

// exported api
// =

export default {
  /**
   * @returns {NavigatorFilesystemPublicAPIRootRecord}
   */
  get () {
    // TODO handle permissions
    // if (!(await sessionPerms.isTrustedApp(this.sender))) {
    //   throw new PermissionsError()
    // }
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
    var isRoot = url === filesystem.get().url
    var isUser = users.isUser(url)
    return {
      isSystemDrive: isRoot || isUser,
      isRoot,
      isUser
    }
  }
}
