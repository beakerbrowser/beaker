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
    var url = await shellAPI.selectDriveDialog.call(this, {tag: 'contact', writable: true})
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
    var url = await shellAPI.selectDriveDialog.call(this, {tag: 'contact', writable: false})
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
    var urls = await shellAPI.selectDriveDialog.call(this, {tag: 'contact', multiple: true, writable: false})
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
    return shellAPI.saveDriveDialog.call(this, url, {tags: 'contact'})
  },

  /**
   * @returns {Promise<Array<BeakerContactPublicAPIContactRecord>>}
   */
  async list () {
    return shellAPI.listDrives.call(this, {tag: 'contact', writable: false})
  },

  async remove (url) {
    return shellAPI.unsaveDrive.call(this, url)
  }
}
