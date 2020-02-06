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
 * @prop {boolean} isTemporary
 * @prop {string} title
 * @prop {string} description
 * @prop {string} createdAt
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

    // write thumbnail
    if (opts.thumbBase64) {
      await writeThumbnail(drive, opts.thumbBase64, opts.thumbExt)
    }

    // save user
    return massageUserRecord(await users.add(drive.url))
  },

  /**
   * @returns {Promise<WebAPIUser>}
   */
  async createTemporary () {
    // create new drive
    var drive = await hyper.drives.createNewDrive({
      type: 'user',
      title: 'Temporary User',
      description: 'Created ' + (new Date()).toLocaleString()
    })

    // save user
    return massageUserRecord(await users.add(drive.url, true))
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
   * @param {Object} opts
   * @param {string} [opts.title]
   * @param {string} [opts.description]
   * @param {string} [opts.thumbBase64]
   * @param {string} [opts.thumbExt]
   * @returns {Promise<WebAPIUser>}
   */
  async edit (url, opts) {
    // fetch user
    var user = await users.get(url)
    if (!user) return

    // update drive
    if (('title' in opts) || ('description' in opts)) {
      let cfg = {}
      if ('title' in opts) cfg.title = opts.title
      if ('description' in opts) cfg.description = opts.description
      await user.drive.pda.updateManifest(cfg)
    }

    // update thumbnail
    if (('thumbBase64' in opts)) {
      await writeThumbnail(user.drive, opts.thumbBase64, opts.thumbExt)
    }

    // update user
    await users.edit(url, opts)
    return massageUserRecord(await users.get(url))
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

async function writeThumbnail (drive, base64, ext) {
  // remove any existing
  await Promise.all([
    drive.pda.unlink('/thumb.jpg').catch(err => {}),
    drive.pda.unlink('/thumb.jpeg').catch(err => {}),
    drive.pda.unlink('/thumb.png').catch(err => {})
  ])
  // write new
  await drive.pda.writeFile(`/thumb.${ext || 'png'}`, base64, 'base64')
}

/**
 * @param {User} record
 * @returns {WebAPIUser}
 */
function massageUserRecord (record) {
  return {
    url: record.url,
    isTemporary: record.isTemporary,
    title: record.title,
    description: record.description,
    createdAt: record.createdAt.toISOString()
  }
}