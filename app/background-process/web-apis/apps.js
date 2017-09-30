import {parse as parseURL} from 'url'
import parseDatUrl from 'parse-dat-url'
import * as archivesDb from '../dbs/archives'
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
    await sitedataDb.setAppPermissions(`app://${name}`, null) // clear old perms
    return appsDb.bind(profileId, name, url)
  },

  async unbind (profileId, name) {
    assertBeakerOnly(this.sender)
    const oldBinding = await appsDb.get(profileId, name)
    await sitedataDb.setAppPermissions(`app://${name}`, null) // clear old perms

    if (oldBinding && isDatUrl(oldBinding.url)) {
      // unsave the archive if it's not owned by the user
      let urlp = parseDatUrl(oldBinding.url)
      let archiveMeta = await archivesDb.getMeta(urlp.host)
      if (!archiveMeta.isOwner) {
        await archivesDb.setUserSettings(0, urlp.host, {isSaved: false})
      }
    }
    
    return appsDb.unbind(profileId, name)
  },

  async runInstaller (profileId, url) {
    assertBeakerOnly(this.sender)
    assertValidBinding(url)
    // run the install modal
    const win = getWebContentsWindow(this.sender)
    const res = await showModal(win, 'install', {url})
    if (res) {
      // update the configuration
      await appsDb.unbindUrlFromAllNames(profileId, url)
      await appsDb.bind(profileId, res.name, url)
      await sitedataDb.setAppPermissions(`app://${res.name}`, res.permissions)
      if (isDatUrl(url)) {
        // save the dat
        let urlp = parseDatUrl(url)
        await archivesDb.setUserSettings(0, urlp.host, {isSaved: true})
      }
    }
    return res
  }
}

function isDatUrl (url) {
  return url.startsWith('dat://') || DAT_HASH_REGEX.test(url)
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