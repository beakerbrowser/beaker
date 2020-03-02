import { UserDeniedError } from 'beaker-error-constants'
import * as drives from '../../hyper/drives'
import * as filesystem from '../../filesystem/index'
import { query } from '../../filesystem/query'
import * as archivesDb from '../../dbs/archives'
import * as modals from '../../ui/subwindows/modals'
import * as userSiteSessions from '../../filesystem/site-sessions'
import * as sessionPerms from '../../lib/session-perms'

// typedefs
// =

/**
 * @typedef {import('../../filesystem/site-sessions').UserSiteSession} UserSiteSession
 * @typedef {import('../../dbs/archives').LibraryArchiveMeta} LibraryArchiveMeta

 * @typedef {Object} User
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 * @prop {Object} [group]
 * @prop {string} [group.url]
 * @prop {string} [group.title]
 * @prop {string} [group.description]
 * @prop {boolean} [group.isMember]
 * @prop {string} [group.userid]
 *
 * @typedef {Object} NavigatorSessionPublicAPIRecord
 * @prop {User} user
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

    // run modal
    var user
    var availableUsers = await listUsers({group: opts.group})
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
        type: 'user',
        memberOf: opts.group
      })
      await filesystem.configDrive(userDrive.url, {seeding: true})
      await userDrive.pda.writeFile(`/thumb.${newUserConfig.thumbExt}`, newUserConfig.thumbBase64, 'base64')
      user = await fetchUserInfo(userDrive.url)
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
    if (session) return massageSessionRecord(await fetchUserInfo(session.userUrl))
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

/**
 * @param {Object} [opts]
 * @param {string} [opts.group]
 * @returns {Promise<User[]>}
 */
async function listUsers (opts = {group: undefined}) {
  var groupFilter = opts && opts.group
  var driveMetas = await filesystem.listDriveMetas()
  driveMetas = driveMetas.filter(drive => drive.type === 'user' && drive.writable)

  var users = await Promise.all(driveMetas.map(fetchUserInfo))
  if (groupFilter) {
    users = users.filter(user => (
      user.group
      && drives.fromURLToKey(user.group.url) === groupFilter)
    )
  }
  return users
}

/**
 * 
 * @param {string|LibraryArchiveMeta} urlOrDriveMeta 
 * @returns {Promise<User>}
 */
async function fetchUserInfo (urlOrDriveMeta) {
  var userMeta
  if (typeof urlOrDriveMeta === 'string') {
    userMeta = await archivesDb.getMeta(urlOrDriveMeta)
  } else {
    userMeta = urlOrDriveMeta
  }
  var groupDrive = userMeta.memberOf ? await drives.getOrLoadDrive(userMeta.memberOf) : undefined

  var group
  if (groupDrive) {
    let groupInfo = await groupDrive.pda.readFile('/index.json').then(JSON.parse).catch(e => undefined)
    group = {
      url: groupDrive.url,
      title: groupInfo ? groupInfo.title : '',
      description: groupInfo ? groupInfo.description : '',
      isMember: false,
      userid: undefined
    }
    let registrationRes = await query(groupDrive, {path: '/users/*', mount: userMeta.key})
    if (registrationRes[0]) {
      group.isMember = true
      group.userid = registrationRes[0].path.split('/').pop()
    }
  }

  return {
    url: userMeta.url,
    title: userMeta.title,
    description: userMeta.description,
    group
  }
}
