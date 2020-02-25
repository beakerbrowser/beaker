import { PermissionsError } from 'beaker-error-constants'
import * as filesystem from '../../filesystem/index'

// typedefs
// =

/**
 * @typedef {Object} BeakereFilesystemPublicAPIRootRecord
 * @prop {string} url
 */

// exported api
// =

export default {
  /**
   * @returns {BeakereFilesystemPublicAPIRootRecord}
   */
  get () {
    if (!this.sender.getURL().startsWith('beaker:')) {
      throw new PermissionsError()
    }
    return {
      url: filesystem.get().url
    }
  }
}
