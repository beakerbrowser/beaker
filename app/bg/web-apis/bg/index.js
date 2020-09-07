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

  getSite (url) {
    return indexer.getSite(url)
  },

  listSites (opts) {
    if (!wcTrust.isWcTrusted(this.sender)) {
      throw new PermissionsError()
    }
    return indexer.listSites(opts)
  },
  
  async getRecord (url) {
    var query = await getQueryPerms(this.sender)
    return indexer.getRecord(url, {query})
  },
  
  async listRecords (opts) {
    var query = await getQueryPerms(this.sender)
    return indexer.listRecords(opts, {query})
  },
  
  async countRecords (opts) {
    var query = await getQueryPerms(this.sender)
    return indexer.countRecords(opts, {query})
  },
  
  async searchRecords (q, opts) {
    var query = await getQueryPerms(this.sender)
    return indexer.searchRecords(q, opts, {query})
  },

  clearNotifications () {
    if (!wcTrust.isWcTrusted(this.sender)) {
      throw new PermissionsError()
    }
    return indexer.clearNotifications()
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