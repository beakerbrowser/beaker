import {parse as parseURL} from 'url'
import * as appsDb from '../dbs/apps'
import * as sitedataDb from '../dbs/sitedata'
import {showModal} from '../ui/modals'
import {getWebContentsWindow} from '../../lib/electron'
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
    await sitedataDb.setAppPermissions(`app://${name}`, null) // clear old perms
    return appsDb.unbind(profileId, name)
  },

  async runInstaller (profileId, url) {
    assertBeakerOnly(this.sender)
    assertValidBinding(url)
    const win = getWebContentsWindow(this.sender)
    const res = await showModal(win, 'install', {url})
    if (res) {
      await appsDb.unbindUrlFromAllNames(profileId, url)
      await appsDb.bind(profileId, res.name, url)
      await sitedataDb.setAppPermissions(`app://${res.name}`, res.permissions)
    }
    return res
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