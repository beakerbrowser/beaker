import * as windows from '../../ui/windows'
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
 * @prop {boolean} isDefault
 * @prop {boolean} isTemporary
 * @prop {boolean} isCurrent
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
    var sessionUrl = getSessionUrl(this.sender)
    var records = await users.list()
    return records.map(record => massageUserRecord(record, sessionUrl))
  },

  /**
   * @param {string} url
   * @returns {Promise<WebAPIUser>}
   */
  async get (url) {
    var sessionUrl = getSessionUrl(this.sender)
    return massageUserRecord(await users.get(url), sessionUrl)
  },

  /**
   * @returns {Promise<WebAPIUser>}
   */
  async getCurrent () {
    var sessionUrl = getSessionUrl(this.sender)
    return massageUserRecord(await users.get(sessionUrl), sessionUrl)
  },

  /**
   * @returns {Promise<WebAPIUser>}
   */
  async getDefault () {
    var sessionUrl = getSessionUrl(this.sender)
    return massageUserRecord(await users.getDefault(), sessionUrl)
  },

  /**
   * @returns {Promise<WebAPIUser>}
   */
  async showCreateDialog () {
    var sessionUrl = getSessionUrl(this.sender)
    var user = await modals.create(this.sender, 'user', {})
    return massageUserRecord(await users.get(user.url), sessionUrl)
  },

  /**
   * @param {Object} opts
   * @param {boolean} opts.setDefault
   * @param {string} opts.title
   * @param {string} opts.description
   * @param {string} opts.thumbBase64
   * @param {string} opts.thumbExt
   * @returns {Promise<WebAPIUser>}
   */
  async create (opts) {
    var sessionUrl = getSessionUrl(this.sender)

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
    return massageUserRecord(await users.add(drive.url), sessionUrl)
  },

  /**
   * @returns {Promise<WebAPIUser>}
   */
  async createTemporary () {
    var sessionUrl = getSessionUrl(this.sender)

    // create new drive
    var drive = await hyper.drives.createNewDrive({
      type: 'user',
      title: 'Temporary User',
      description: 'Created ' + (new Date()).toLocaleString()
    })

    // save user
    return massageUserRecord(await users.add(drive.url, false, true), sessionUrl)
  },

  /**
   * @param {string} url
   * @returns {Promise<WebAPIUser>}
   */
  async add (url) {
    var sessionUrl = getSessionUrl(this.sender)
    return massageUserRecord(await users.add(url), sessionUrl)
  },

  /**
   * @param {string} url
   * @param {Object} opts
   * @param {boolean} [opts.setDefault]
   * @param {string} [opts.title]
   * @param {string} [opts.description]
   * @param {string} [opts.thumbBase64]
   * @param {string} [opts.thumbExt]
   * @returns {Promise<WebAPIUser>}
   */
  async edit (url, opts) {
    var sessionUrl = getSessionUrl(this.sender)

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
    return massageUserRecord(await users.get(url), sessionUrl)
  },

  /**
   * @param {string} url
   * @returns {Promise<void>}
   */
  async remove (url) {
    return users.remove(url)
  },

  /**
   * Used by beaker://setup
   * 
   * @param {Object} opts
   * @param {string} [opts.title]
   * @param {string} [opts.description]
   * @param {string} [opts.thumbBase64]
   * @param {string} [opts.thumbExt]
   */
  async setupDefault (opts) {
    var user = await users.getDefault()
    await user.drive.pda.updateManifest({
      title: opts.title,
      description: opts.description
    })
    if (('thumbBase64' in opts)) {
      await writeThumbnail(user.drive, opts.thumbBase64, opts.thumbExt)
    }
    await users.edit(user.url, opts)
  }
}

// internal methods
// =

function getSessionUrl (sender) {
  try {
    var userSession = windows.getUserSessionFor(sender)
    if (!userSession) throw new Error('No active user session')
    return userSession.url
  } catch (e) {
    if (sender.getURL().startsWith('beaker:')) {
      return undefined
    }
    throw e
  }
}

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
function massageUserRecord (record, sessionUrl) {
  return {
    url: record.url,
    isDefault: record.isDefault,
    isTemporary: record.isTemporary,
    isCurrent: record.url === sessionUrl,
    title: record.title,
    description: record.description,
    createdAt: record.createdAt.toISOString()
  }
}