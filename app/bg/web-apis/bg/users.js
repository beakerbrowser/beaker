import * as globals from '../../globals'
import * as users from '../../filesystem/users'
import dat from '../../dat/index'

// typedefs
// =

/**
 * @typedef {import('../../filesystem/users').User} User
 *
 * @typedef {Object} WebAPIUser
 * @prop {string} label
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
   * @param {Object} opts
   * @param {string} opts.label
   * @param {boolean} opts.setDefault
   * @param {string} opts.title
   * @param {string} opts.description
   * @param {string} opts.thumbBase64
   * @param {string} opts.thumbExt
   * @returns {Promise<WebAPIUser>}
   */
  async create (opts) {
    var sessionUrl = getSessionUrl(this.sender)

    // validate
    users.validateUserLabel(opts.label)

    // create new dat archive
    var archive = await dat.archives.createNewArchive({
      type: 'unwalled.garden/person',
      title: opts.title,
      description: opts.description
    })

    // write thumbnail
    if (opts.thumbBase64) {
      await writeThumbnail(archive, opts.thumbBase64, opts.thumbExt)
    }

    // save user
    return massageUserRecord(await users.add(opts.label, archive.url), sessionUrl)
  },

  /**
   * @returns {Promise<WebAPIUser>}
   */
  async createTemporary () {
    var sessionUrl = getSessionUrl(this.sender)

    // create new dat archive
    var archive = await dat.archives.createNewArchive({
      type: 'unwalled.garden/person',
      title: 'Temporary User',
      description: 'Created ' + (new Date()).toLocaleString()
    })

    // save user
    return massageUserRecord(await users.add(`temp-${Date.now()}`, archive.url, false, true), sessionUrl)
  },

  /**
   * @param {string} label
   * @param {string} url
   * @returns {Promise<WebAPIUser>}
   */
  async add (label, url) {
    var sessionUrl = getSessionUrl(this.sender)
    return massageUserRecord(await users.add(label, url), sessionUrl)
  },

  /**
   * @param {string} url
   * @param {Object} opts
   * @param {string} [opts.label]
   * @param {boolean} [opts.setDefault]
   * @param {string} [opts.title]
   * @param {string} [opts.description]
   * @param {string} [opts.thumbBase64]
   * @param {string} [opts.thumbExt]
   * @returns {Promise<WebAPIUser>}
   */
  async edit (url, opts) {
    var sessionUrl = getSessionUrl(this.sender)

    // validate
    if (opts.label) users.validateUserLabel(opts.label)

    // fetch user
    var user = await users.get(url)
    if (!user) return

    // update archive
    if (('title' in opts) || ('description' in opts)) {
      let cfg = {}
      if ('title' in opts) cfg.title = opts.title
      if ('description' in opts) cfg.description = opts.description
      await user.archive.pda.updateManifest(cfg)
    }

    // update thumbnail
    if (('thumbBase64' in opts)) {
      await writeThumbnail(user.archive, opts.thumbBase64, opts.thumbExt)
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
  }
}

// internal methods
// =

function getSessionUrl (sender) {
  var userSession = globals.userSessionAPI.getFor(sender)
  if (!userSession) throw new Error('No active user session')
  return userSession.url
}

async function writeThumbnail (archive, base64, ext) {
  // remove any existing
  await Promise.all([
    archive.pda.unlink('/thumb.jpg').catch(err => {}),
    archive.pda.unlink('/thumb.jpeg').catch(err => {}),
    archive.pda.unlink('/thumb.png').catch(err => {})
  ])
  // write new
  await archive.pda.writeFile(`/thumb.${ext || 'png'}`, base64, 'base64')
}

/**
 * @param {User} record
 * @returns {WebAPIUser}
 */
function massageUserRecord (record, sessionUrl) {
  return {
    label: record.label,
    url: record.url,
    isDefault: record.isDefault,
    isTemporary: record.isTemporary,
    isCurrent: record.url === sessionUrl,
    title: record.title,
    description: record.description,
    createdAt: record.createdAt.toISOString()
  }
}