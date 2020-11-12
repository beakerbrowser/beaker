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
    var url = await shellAPI.selectDriveDialog.call(this, {tag: 'user-profile', writable: true})
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
    var url = await shellAPI.selectDriveDialog.call(this, {tag: 'user-profile', writable: false})
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
    var urls = await shellAPI.selectDriveDialog.call(this, {tag: 'user-profile', multiple: true, writable: false})
    let infos = await Promise.all(urls.map(url => (
      drives.getDriveInfo(url, {ignoreCache: false, onlyCache: true}).catch(e => ({}))
    )))
    return infos.map(info => ({
      url: info.url,
      title: info.title || '',
      description: info.description || ''
    }))
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
