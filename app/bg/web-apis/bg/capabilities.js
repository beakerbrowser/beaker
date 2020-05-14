import { parseDriveUrl } from '../../../lib/urls'
import * as capabilities from '../../hyper/capabilities'

// exported api
// =

export default {
  /**
   * @param {String} target
   * @returns {Promise<String>}
   */
  async create (target) {
    var origin = parseDriveUrl(this.sender.getURL()).origin
    return capabilities.createCap(origin, target)
  },

  /**
   * @param {String} capUrl
   * @param {String} target
   * @returns {Promise<Void>}
   */
  async modify (capUrl, target) {
    var origin = parseDriveUrl(this.sender.getURL()).origin    
    return capabilities.modifyCap(origin, capUrl, target)
  },

  /**
   * @param {String} capUrl
   * @returns {Promise<Void>}
   */
  async delete (capUrl) {
    var origin = parseDriveUrl(this.sender.getURL()).origin    
    return capabilities.deleteCap(origin, capUrl)
  }
}