/*
TODO(apps) this API is currently not in use, but will be rebuilt for use in a future iteration -prf
*/

import parseDatUrl from 'parse-dat-url'
import * as archivesDb from '../dbs/archives'
import * as appsDb from '../dbs/apps'
import * as sitedataDb from '../dbs/sitedata'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import {showModal} from '../ui/modals'
import {getWebContentsWindow} from '../../lib/electron'
import {DAT_HASH_REGEX} from '../../lib/const'
import {getFullGranted} from '../../lib/app-perms'
import {PermissionsError, InvalidURLError} from 'beaker-error-constants'


// events emitted to rpc clients
const appsEvents = new EventEmitter()

// exported api
// =

export default {
  createEventsStream () {
    return emitStream(appsEvents)
  },

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

    // TEMP
    // any binding made manually with bind() is given full perms
    // when permissions become session-based, this should be removed
    // -prf
    await sitedataDb.setAppPermissions(`app://${name}`, getFullGranted())

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

    await appsDb.unbind(profileId, name)
    appsEvents.emit('apps-binding-changed')
    return
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
    appsEvents.emit('apps-binding-changed')
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