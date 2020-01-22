import { PermissionsError } from 'beaker-error-constants'
import * as sessionPerms from '../../lib/session-perms'
import * as filesystem from '../../filesystem/index'
import _pick from 'lodash.pick'

// typedefs
// =

/**
 * @typedef {import('../../filesystem/query').FSQueryOpts} FSQueryOpts
 * @typedef {import('../../filesystem/query').FSQueryResult} FSQueryResult
 *
 * @typedef {Object} NavigatorFilesystemPublicAPIRootRecord
 * @prop {string} url
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
  }
}
