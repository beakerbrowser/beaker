import { UserDeniedError } from 'beaker-error-constants'
import * as drives from '../../hyper/drives'
import * as modals from '../../ui/subwindows/modals'
import * as users from '../../filesystem/users'
import * as userSiteSessions from '../../filesystem/site-sessions'
import * as sessionPerms from '../../lib/session-perms'

// typedefs
// =

/**
 * @typedef {import('../../filesystem/users').User} User
 * @typedef {import('../../filesystem/site-sessions').UserSiteSession} UserSiteSession
 *
 * @typedef {Object} NavigatorSessionPublicAPIRecord
 * @prop {Object} user
 * @prop {string} [user.id]
 * @prop {string} user.url
 * @prop {string} user.title
 * @prop {string} user.description
 * @prop {Object} [user.group]
 * @prop {string} [user.group.url]
 * @prop {string} [user.group.title]
 * @prop {string} [user.group.description]
 */

// exported api
// =

export default {
  /**
   * @param {Object} opts
   * @param {string} [opts.group]
   * @param {Object} [opts.permissions]
   * @returns {Promise<NavigatorSessionPublicAPIRecord>}
   */
  async request (opts = {}) {
    var siteOrigin = await sessionPerms.toDriveOrigin(this.sender.getURL())
    if (typeof opts !== 'object') {
      throw new Error('First argument must be an object')
    }
    if (opts && typeof opts.group !== 'string') {
      throw new Error('The `group` parameter must be a string (URL)')
    }
    if (opts.group) {
      try {
        opts.group = await drives.fromURLToKey(opts.group, true)
      } catch (e) {
        throw new Error('The `group` parameter is not a valid hyperdrive URL')
      }
    }
    if (opts.permissions && !Array.isArray(opts.permissions)) {
      throw new Error('The `permissions` parameter must be an array of strings')
    }
    opts.permissions = (opts.permissions || []).filter(p => typeof p === 'string')

    // TEMP require the group URL
    if (!opts.group) throw new Error('The `group` parameter is required')
    var groupUrl = opts.group

    // create a user if none exists for this group
    var user = (await users.list({group: groupUrl}))[0]
    if (!user) {
      // fetch info about the group
      let groupDrive = await drives.getOrLoadDrive(groupUrl)
      let groupInfo
      try {
        groupInfo = await groupDrive.pda.readFile('/index.json').then(JSON.parse)
      } catch (e) {
        console.log(e)
        throw new Error('Invalid group: the index.json of the group has not been configured correctly')
      }

      // run modal
      let availableUsers = users.list({group: groupUrl})
      let userConfig
      try {
        userConfig = await modals.create(this.sender, 'user', {
          site: {url: siteOrigin},
          users: availableUsers,
          group: groupUrl,
          permissions: opts.permissions
        })
      } catch (e) {
        throw new UserDeniedError()
      }

      // create the user
      let userDrive = await drives.createNewDrive({
        title: userConfig.title || 'Anonymous',
        description: userConfig.description,
        type: 'user'
      })
      await userDrive.pda.writeFile(`/thumb.${userConfig.thumbExt}`, userConfig.thumbBase64, 'base64')
      await userDrive.pda.mount('/group', groupUrl)
      user = await users.add(userDrive.url, userConfig.title, groupInfo.title)
    }

    // create the session
    await userSiteSessions.create(siteOrigin, user.url, opts.permissions)
    return massageSessionRecord(user)
  },

  /**
   * @param {string} siteOrigin only usable from beaker:// origins
   * @returns {Promise<NavigatorSessionPublicAPIRecord>}
   */
  async get (siteOrigin = undefined) {
    if (this.sender.getURL().startsWith('beaker:') && siteOrigin) {
      // trusted app, use given url
      siteOrigin = await sessionPerms.toDriveOrigin(siteOrigin)
    } else {
      // use sender url
      siteOrigin = await sessionPerms.toDriveOrigin(this.sender.getURL())
    }
    var session = await userSiteSessions.get(siteOrigin)
    if (session) return massageSessionRecord(await users.get(session.userUrl))
  },

  /**
   * @param {string} siteOrigin only usable from beaker:// origins
   * @returns {Promise<void>}
   */
  async destroy (siteOrigin = undefined) {
    if (this.sender.getURL().startsWith('beaker:') && siteOrigin) {
      // trusted app, use given url
      siteOrigin = await sessionPerms.toDriveOrigin(siteOrigin)
    } else {
      // use sender url
      siteOrigin = await sessionPerms.toDriveOrigin(this.sender.getURL())
    }
    await userSiteSessions.destroy(siteOrigin)
  }
}

// internal methods
// =

/**
 * @param {User} user
 * @returns {NavigatorSessionPublicAPIRecord}
 */
function massageSessionRecord (user) {
  if (!user) return undefined
  return {
    user: {
      id: user.id,
      url: user.url,
      title: user.title,
      description: user.description,
      group: user.group
    }
  }
}