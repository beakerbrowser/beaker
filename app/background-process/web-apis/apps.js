import {parse as parseURL} from 'url'
import * as appsDb from '../dbs/apps'
import {DAT_HASH_REGEX} from '../../lib/const'
import {PermissionsError, InvalidURLError} from 'beaker-error-constants'

// exported api
// =

export default {
  async get(name) {
    assertBeakerOnly(this.sender)
    return appsDb.get(0, name)
  },

  async list() {
    assertBeakerOnly(this.sender)
    return appsDb.list(0)
  },

  async bind(name, url) {
    assertBeakerOnly(this.sender)
    var key = toKey(url)
    return appsDb.bind(0, name, `dat://${key}`)
  },

  async remove(name) {
    assertBeakerOnly(this.sender)
    return appsDb.unbind(0, name)
  }
}

// temporary helper to make sure the call is made by a beaker: page
function assertBeakerOnly (sender) {
  if (!sender.getURL().startsWith('beaker:')) {
    throw new PermissionsError()
  }
}

// helper to convert the given URL to a dat key
function toKey (url) {
  if (DAT_HASH_REGEX.test(url)) {
    // simple case: given the key
    return url
  } 
  
  var urlp = parseURL(url)

  // validate
  if (urlp.protocol !== 'dat:') {
    throw new InvalidURLError('URL must be a dat: scheme')
  }
  if (!DAT_HASH_REGEX.test(urlp.host)) {
    // TODO- support dns lookup?
    throw new InvalidURLError('Hostname is not a valid hash')
  }

  return urlp.host
}