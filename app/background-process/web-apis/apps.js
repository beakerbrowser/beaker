import {parse as parseURL} from 'url'
import * as appsDb from '../dbs/apps'
import {DAT_HASH_REGEX} from '../../lib/const'
import {PermissionsError, InvalidURLError} from 'beaker-error-constants'

// exported api
// =

export default {
  async get (profileId, name) {
    assertBeakerOnly(this.sender)
    return appsDb.get(profileId, name)
  },

  async list (profileId) {
    assertBeakerOnly(this.sender)
    return appsDb.list(profileId)
  },

  async bind (profileId, name, url) {
    assertBeakerOnly(this.sender)
    assertValidBinding(url)
    return appsDb.bind(profileId, name, url)
  },

  async unbind (profileId, name) {
    assertBeakerOnly(this.sender)
    return appsDb.unbind(profileId, name)
  }
}

function assertBeakerOnly (sender) {
  if (!sender.getURL().startsWith('beaker:')) {
    throw new PermissionsError()
  }
}

function assertValidBinding (url) {
  if (!url || typeof url !== 'string' || (!url.startsWith('dat://') && !url.startsWith('file:///'))) {
    throw new InvalidURLError('URL must be dat: or file:///')
  }
}