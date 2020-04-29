import * as modals from '../../ui/subwindows/modals'
import * as drives from '../../hyper/drives'
import * as filesystem from '../../filesystem/index'
import * as permissions from '../../ui/permissions'
import { UserDeniedError, PermissionsError } from 'beaker-error-constants'
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
    var addressBook = await readAddressBook()
    addressBook.profiles = await assembleRecords(addressBook.profiles)

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
    var addressBook = await readAddressBook()
    addressBook.profiles = await assembleRecords(addressBook.profiles)
    addressBook.contacts = await assembleRecords(addressBook.contacts)

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
    var addressBook = await readAddressBook()
    addressBook.profiles = await assembleRecords(addressBook.profiles)
    addressBook.contacts = await assembleRecords(addressBook.contacts)

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

    var addressBook = await readAddressBook()
    var existingContact = addressBook.contacts.find(contact => contact.key === res.key)
    if (!existingContact) {
      addressBook.contacts.push({key: res.key})
    }
    await filesystem.get().pda.writeFile('/address-book.json', JSON.stringify(addressBook, null, 2))

    if (res.host) {
      await filesystem.configDrive(res.key)
    }
  },

  /**
   * @returns {Promise<Array<BeakerContactPublicAPIContactRecord>>}
   */
  async list () {
    if (!(await permissions.requestPermission('contactsList', this.sender))) {
      throw new UserDeniedError()
    }

    var addressBook = await readAddressBook()
    return assembleRecords(addressBook.contacts)
  },

  async remove (url) {
    if (!isBeakerApp(this.sender)) {
      throw new PermissionsError()
    }
    var key = await drives.fromURLToKey(url, true)
    var addressBook = await readAddressBook()
    var index = addressBook.contacts.findIndex(contact => contact.key === key)
    if (index !== -1) {
      addressBook.contacts.splice(index, 1)
    }
    await filesystem.get().pda.writeFile('/address-book.json', JSON.stringify(addressBook, null, 2))
  }
}

// internal methods
// =

async function readAddressBook () {
  const sysDrive = filesystem.get().pda
  var addressBook = await sysDrive.readFile('/address-book.json').then(JSON.parse).catch(e => undefined)
  if (!addressBook || typeof addressBook !== 'object') addressBook = {}
  if (!addressBook.contacts || !Array.isArray(addressBook.contacts)) addressBook.contacts = []
  if (!addressBook.profiles || !Array.isArray(addressBook.profiles)) addressBook.profiles = []
  return addressBook
}

async function assembleRecords (contactsList) {
  var records = []
  for (let contact of contactsList) {
    if (typeof contact.key !== 'string' || !HYPERDRIVE_HASH_REGEX.test(contact.key)) continue
    let url = `hyper://${contact.key}/`
    let info = await drives.getDriveInfo(contact.key, {ignoreCache: false, onlyCache: true}).catch(e => ({}))
    records.push({
      url,
      title: info.title || '',
      description: info.description || ''
    })
  }
  return records
}

function isBeakerApp (sender) {
  if (/^(beaker:|https?:\/\/(.*\.)?hyperdrive\.network(:|\/))/.test(sender.getURL())) {
    return true
  }
  return false
}