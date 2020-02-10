import * as modals from '../../ui/subwindows/modals'
import * as users from '../../filesystem/users'
import hyper from '../../hyper/index'

// typedefs
// =

/**
 * @typedef {import('../../filesystem/users').User} User
 *
 * @typedef {Object} WebAPIUser
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 */

// exported api
// =

export default {
  /**
   * @returns {Promise<WebAPIUser[]>}
   */
  async list () {
    var records = await users.list()
    return records.map(record => massageUserRecord(record))
  },

  /**
   * @param {string} url
   * @returns {Promise<WebAPIUser>}
   */
  async get (url) {
    return massageUserRecord(await users.get(url))
  },

  /**
   * @returns {Promise<WebAPIUser>}
   */
  async showCreateDialog () {
    var user = await modals.create(this.sender, 'user', {})
    return massageUserRecord(await users.get(user.url))
  },

  /**
   * @param {Object} opts
   * @param {string} opts.title
   * @param {string} opts.description
   * @param {string} opts.thumbBase64
   * @param {string} opts.thumbExt
   * @returns {Promise<WebAPIUser>}
   */
  async create (opts) {
    // create new drive
    var drive = await hyper.drives.createNewDrive({
      type: 'user',
      title: opts.title,
      description: opts.description
    })

    // save user
    return massageUserRecord(await users.add(drive.url))
  },

  /**
   * @param {string} url
   * @returns {Promise<WebAPIUser>}
   */
  async add (url) {
    return massageUserRecord(await users.add(url))
  },

  /**
   * @param {string} url
   * @returns {Promise<void>}
   */
  async remove (url) {
    return users.remove(url)
  }
}

// internal methods
// =

/**
 * @param {User} record
 * @returns {WebAPIUser}
 */
function massageUserRecord (record) {
  return {
    url: record.url,
    title: record.title,
    description: record.description
  }
}