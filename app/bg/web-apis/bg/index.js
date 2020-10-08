import { PermissionsError } from 'beaker-error-constants'
import * as siteSessions from '../../dbs/site-sessions'
import { enumeratePerms } from '../../../lib/session-permissions'
import * as wcTrust from '../../wc-trust'
import * as indexer from '../../indexer/index'

// exported api
// =

export default {
  clearAllData () {
    if (!wcTrust.isWcTrusted(this.sender)) {
      throw new PermissionsError()
    }
    return indexer.clearAllData()
  },
  
  async gql (query, variables) {
    var queryPerms = await getQueryPerms(this.sender)
    return indexer.gql(query, variables, {query: queryPerms})
  },

  getState () {
    if (!wcTrust.isWcTrusted(this.sender)) {
      throw new PermissionsError()
    }
    return indexer.getState()
  },

  createEventStream () {
    if (!wcTrust.isWcTrusted(this.sender)) {
      throw new PermissionsError()
    }
    return indexer.createEventStream()
  }
}

// internal methods
// =

async function getQueryPerms (sender) {
  if (wcTrust.isWcTrusted(sender)) {
    return undefined // all access allowed
  }
  var session = await siteSessions.get(sender.getURL())
  if (!session) throw new PermissionsError()
  return enumeratePerms(session.permissions)
}