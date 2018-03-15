import rpc from 'pauls-electron-rpc'
import errors from 'beaker-error-constants'
import userSessionManifest from '../api-manifests/external/user-session'

// create the rpc api
const userSessionRPC = rpc.importAPI('user-session', userSessionManifest, { timeout: false, errors })

export default class UserSession {
  constructor () {
    this.permissions = null
  }

  static async fetch () {
    var errStack = (new Error()).stack
    try {
      var session = new UserSession()
      var data = await userSessionRPC.fetch()
      session.permissions = data.permissions
      return session
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }
}

function throwWithFixedStack (e, errStack) {
  e = e || new Error()
  e.stack = e.stack.split('\n')[0] + '\n' + errStack.split('\n').slice(2).join('\n')
  throw e
}
