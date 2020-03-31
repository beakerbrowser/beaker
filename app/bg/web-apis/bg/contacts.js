import * as modals from '../../ui/subwindows/modals'
import * as filesystem from '../../filesystem/index'
import * as permissions from '../../ui/permissions'
import { UserDeniedError } from 'beaker-error-constants'
import { HYPERDRIVE_HASH_REGEX } from '../../../lib/const'

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
    const sysDrive = filesystem.get().pda
    var addressBook = await sysDrive.readFile('/address-book.json').then(JSON.parse).catch(e => ({contacts: []}))

    var res
    try {
      res = await modals.create(this.sender, 'select-contact', {multiple: false, showProfilesOnly: true, addressBook})
    } catch (e) {
      if (e.name !== 'Error') {
        throw e // only rethrow if a specific error
      }
    }
    if (!res) throw new UserDeniedError()
    return res && res.contacts ? res.contacts[0] : undefined
  },

  /**
   * @returns {Promise<BeakerContactPublicAPIContactRecord>}
   */
  async requestContact () {
    const sysDrive = filesystem.get().pda
    var addressBook = await sysDrive.readFile('/address-book.json').then(JSON.parse).catch(e => ({contacts: []}))

    var res
    try {
      res = await modals.create(this.sender, 'select-contact', {multiple: false, addressBook})
    } catch (e) {
      if (e.name !== 'Error') {
        throw e // only rethrow if a specific error
      }
    }
    if (!res) throw new UserDeniedError()
    return res && res.contacts ? res.contacts[0] : undefined
  },

  /**
   * @returns {Promise<Array<BeakerContactPublicAPIContactRecord>>}
   */
  async requestContacts () {
    const sysDrive = filesystem.get().pda
    var addressBook = await sysDrive.readFile('/address-book.json').then(JSON.parse).catch(e => ({contacts: []}))

    var res
    try {
      res = await modals.create(this.sender, 'select-contact', {multiple: true, addressBook})
    } catch (e) {
      if (e.name !== 'Error') {
        throw e // only rethrow if a specific error
      }
    }
    if (!res) throw new UserDeniedError()
    return res && res.contacts ? res.contacts : undefined
  },

  /**
   * @param {string} url 
   * @returns {Promise<void>}
   */
  async requestAddContact (url) {
    var res
    try {
      res = await modals.create(this.sender, 'add-contact', {url})
    } catch (e) {
      if (e.name !== 'Error') {
        throw e // only rethrow if a specific error
      }
    }
    if (!res) throw new UserDeniedError()

    const sysDrive = filesystem.get().pda
    var addressBook = await sysDrive.readFile('/address-book.json').then(JSON.parse).catch(e => ({contacts: []}))
    addressBook.contacts = addressBook.contacts || []
    var existingContact = addressBook.contacts.find(contact => contact.key === res.key)
    if (existingContact) {
      existingContact.title = res.title
      existingContact.description = res.description
    } else {
      addressBook.contacts.push({
        key: res.key,
        title: res.title,
        description: res.description
      })
    }
    await sysDrive.writeFile('/address-book.json', JSON.stringify(addressBook, null, 2))
  },

  /**
   * @returns {Promise<Array<BeakerContactPublicAPIContactRecord>>}
   */
  async list () {
    if (!(await permissions.requestPermission('contactsList', this.sender))) {
      throw new UserDeniedError()
    }

    const sysDrive = filesystem.get().pda
    var addressBook = await sysDrive.readFile('/address-book.json').then(JSON.parse).catch(e => ({contacts: []}))
    return massageContacts(addressBook.contacts)
  },
}

/**
 * @param {Object[]} contacts 
 * @returns {BeakerContactPublicAPIContactRecord[]}
 */
function massageContacts (contacts) {
  var res = []
  for (let contact of contacts) {
    if (!contact || typeof contact !== 'object') continue
    if (typeof contact.key !== 'string' || !HYPERDRIVE_HASH_REGEX.test(contact.key)) continue
    res.push({
      url: `hyper://${contact.key}/`,
      title: contact.title,
      description: contact.description
    })
  }
  return res
}