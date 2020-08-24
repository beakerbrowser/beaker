import * as subscriptions from '../../filesystem/subscriptions'
import * as wcTrust from '../../wc-trust'
import { PermissionsError } from 'beaker-error-constants'

// exported api
// =

export default {
  list (...args) {
    if (!wcTrust.isWcTrusted(this.sender)) {
      throw new PermissionsError()
    }
    return subscriptions.list(...args)
  },

  listNetworkFor (...args) {
    if (!wcTrust.isWcTrusted(this.sender)) {
      throw new PermissionsError()
    }
    return subscriptions.listNetworkFor(...args)
  },

  get (...args) {
    if (!wcTrust.isWcTrusted(this.sender)) {
      throw new PermissionsError()
    }
    return subscriptions.get(...args)
  },

  add (...args) {
    if (!wcTrust.isWcTrusted(this.sender)) {
      throw new PermissionsError()
    }
    return subscriptions.add(...args)
  },

  remove (...args) {
    if (!wcTrust.isWcTrusted(this.sender)) {
      throw new PermissionsError()
    }
    return subscriptions.remove(...args)
  }
}