import { UserDeniedError } from 'beaker-error-constants'
import * as drives from '../../hyper/drives'
import * as modals from '../../ui/subwindows/modals'
import * as users from '../../filesystem/users'
import * as bookmarks from '../../filesystem/bookmarks'
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
 * @prop {string} user.url
 * @prop {string} user.title
 * @prop {string} user.description
 * @prop {Object} [user.group]
 * @prop {string} [user.group.url]
 * @prop {string} [user.group.title]
 * @prop {string} [user.group.description]
 * @prop {boolean} [user.group.isMember]
 * @prop {string} [user.group.userid]
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
    if (!opts || typeof opts !== 'object') {
      throw new Error('First argument must be an object')
    }
    opts.group = opts.group || siteOrigin
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

    // fetch info about the group
    var groupDrive = await drives.getOrLoadDrive(opts.group)
    var groupInfo
    try {
      groupInfo = await groupDrive.pda.readFile('/index.json').then(JSON.parse)
    } catch (e) {
      console.log(e)
      throw new Error('Invalid group: the index.json of the group has not been configured correctly')
    }

    // run modal
    var user
    var availableUsers = await users.list({group: opts.group})
    var newUserConfig = undefined
    var selectedUser = undefined
    if (availableUsers.length > 0) {
      let currentModal = 'select'
      while (!newUserConfig && !selectedUser) {
        if (currentModal === 'select') {
          try {
            selectedUser = await modals.create(this.sender, 'user-select', {
              users: availableUsers
            })
            if (selectedUser.gotoCreate) {
              selectedUser = undefined
              currentModal = 'create'
            }
          } catch (e) {
            throw new UserDeniedError()
          }
        } else {
          try {
            newUserConfig = await modals.create(this.sender, 'user-editor', {})
          } catch (e) {
            currentModal = 'select'
          }
        }
      }
    } else {
      try {
        newUserConfig = await modals.create(this.sender, 'user-editor', {})
      } catch (e) {
        throw new UserDeniedError()
      }
    }          

    if (newUserConfig) {
      // create the user
      let userDrive = await drives.createNewDrive({
        title: newUserConfig.title || 'Anonymous',
        description: newUserConfig.description,
        type: 'user'
      })
      await userDrive.pda.writeFile(`/thumb.${newUserConfig.thumbExt}`, newUserConfig.thumbBase64, 'base64')
      await userDrive.pda.mount('/group', opts.group)
      user = await users.add(userDrive.url, newUserConfig.title, groupInfo.title)

      // create a start-page bookmark for the group
      if (!(await bookmarks.get(opts.group))) {
        await bookmarks.add({
          location: '/desktop',
          href: `hyper://${opts.group}`,
          title: groupInfo.title || 'Untitled Group'
        })
      }
    } else {
      // select existing user
      user = availableUsers.find(u => selectedUser.url === u.url)
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
      url: user.url,
      title: user.title,
      description: user.description,
      group: user.group
    }
  }
}