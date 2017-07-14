import rpc from 'pauls-electron-rpc'
import userSessionManifest from '../api-manifests/external/user-session'
import {DatUserProfile} from './dat-user-profile'
import errors from 'beaker-error-constants'

// create the dat rpc api
const userSessionRPC = rpc.importAPI('user-session', userSessionManifest, { timeout: false, errors })

// readonly form
export class UserSession {
  constructor() {
    populate(this, false)
  }

  async requestSignin () {
    await userSessionRPC.requestSignin()
  }

  async signout () {
    await userSessionRPC.signout()
    populate(this, false)
  }

  static async fetch () {
    // pull the session info from the backend (which will check our cookies)
    var sess = new UserSession()
    var sessionData = await userSessionRPC.fetch()
    populate(sess, sessionData)
    return sess
  }
}

// writable form (internal)
export class UserSessionWritable extends UserSession {
  static async createSession (opts) {
    return await userSessionRPC.createSession(opts)
  }
}

function populate (sess, sessionData) {
  if (sessionData) {
    // session exists, construct data
    sess.isActive = true
    sess.profile = new DatUserProfile(sessionData.url)
  } else {
    sess.isActive = false
    sess.profile = null
  }
}
