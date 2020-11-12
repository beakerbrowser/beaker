import * as drives from '../../hyper/drives'
import shellAPI from './shell.js'

// typedefs
// =

/**
 * @typedef {Object} BeakerContactPublicAPIContactRecord
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 */

// exported api
// =

export default {
  /**
   * @returns {Promise<BeakerContactPublicAPIContactRecord>}
   */
  async requestProfile () {
    var url = await shellAPI.selectDriveDialog.call(this, {writable: true})
    let info = await drives.getDriveInfo(url, {ignoreCache: false, onlyCache: true}).catch(e => ({}))
    return {
      url,
      title: info.title || '',
      description: info.description || ''
    }
  },

  /**
   * @returns {Promise<BeakerContactPublicAPIContactRecord>}
   */
  async requestContact () {
    var url = await shellAPI.selectDriveDialog.call(this, {writable: false})
    let info = await drives.getDriveInfo(url, {ignoreCache: false, onlyCache: true}).catch(e => ({}))
    return {
      url,
      title: info.title || '',
      description: info.description || ''
    }
  },

  /**
   * @returns {Promise<Array<BeakerContactPublicAPIContactRecord>>}
   */
  async requestContacts () {
    var url = await shellAPI.selectDriveDialog.call(this, {writable: false})
    let info = await drives.getDriveInfo(url, {ignoreCache: false, onlyCache: true}).catch(e => ({}))
    return {
      url,
      title: info.title || '',
      description: info.description || ''
    }
  },

  /**
   * @param {string} url 
   * @returns {Promise<void>}
   */
  async requestAddContact (url) {
    throw new Error('The beaker.contacts API has been deprecated')
  },

  /**
   * @returns {Promise<Array<BeakerContactPublicAPIContactRecord>>}
   */
  async list () {
    throw new Error('The beaker.contacts API has been deprecated')
  },

  async remove (url) {
    throw new Error('The beaker.contacts API has been deprecated')
  }
}
