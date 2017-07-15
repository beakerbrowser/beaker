import {BrowserWindow} from 'electron'
import {parse as parseURL} from 'url'
import pda from 'pauls-dat-api'
import datDns from '../networks/dat/dns'
import * as datLibrary from '../networks/dat/library'
import * as archivesDb from '../dbs/archives'
import {DAT_HASH_REGEX, DEFAULT_DAT_API_TIMEOUT} from '../../lib/const'
import {showModal} from '../ui/modals'
import {validateLocalPath, showDeleteArchivePrompt} from '../browser'
import {timer} from '../../lib/time'
import {
  ArchiveNotWritableError,
  InvalidURLError,
  InvalidPathError,
  UserDeniedError
} from 'beaker-error-constants'

// exported api
// =

const to = (opts) =>
  (opts && typeof opts.timeout !== 'undefined')
    ? opts.timeout
    : DEFAULT_DAT_API_TIMEOUT

export default {
  async status () {
    var status = {archives: 0, peers: 0}
    var archives = datLibrary.getActiveArchives()
    for (var k in archives) {
      status.archives++
      status.peers += archives[k].metadata.peers.length
    }
    return status
  },

  async create ({title, description} = {}) {
    return datLibrary.createNewArchive({title, description})
  },

  async fork (url, {title, description} = {}) {
    return datLibrary.forkArchive(url, {title, description})
  },

  async update (url, manifestInfo, userSettings) {
    var key = toKey(url)
    var archive = await datLibrary.getOrLoadArchive(key)

    // no info provided: open modal
    if (!manifestInfo && !userSettings) {
      if (!archive.writable) {
        throw new ArchiveNotWritableError()
      }
      // show the update-info the modal
      let win = BrowserWindow.fromWebContents(this.sender)
      await assertSenderIsFocused(this.sender)
      return showModal(win, 'create-archive', {url})
    }

    // validate path
    if (userSettings && userSettings.localPath && !validateLocalPath(userSettings.localPath).valid) {
      throw new InvalidPathError('Cannot save the site to that folder')
    }

    // update manifest file
    if (manifestInfo) {
      var archiveInfo = await archivesDb.getMeta(key)
      var {title, description} = manifestInfo
      title = typeof title !== 'undefined' ? title : archiveInfo.title
      description = typeof description !== 'undefined' ? description : archiveInfo.description
      if (title !== archiveInfo.title || description !== archiveInfo.description) {
        await pda.updateManifest(archive, {title, description})
        datLibrary.pullLatestArchiveMeta(archive)
      }
    }

    // update settings
    if (userSettings) {
      var oldLocalPath = archive.staging ? archive.staging.path : false
      userSettings = await archivesDb.setUserSettings(0, key, userSettings)
      await datLibrary.configureStaging(archive, userSettings)
      if (userSettings.localPath && userSettings.localPath !== oldLocalPath) {
        datLibrary.deleteOldStagingFolder(oldLocalPath)
      }
    }
  },

  async add (url) {
    var key = toKey(url)

    // pull metadata
    var archive = await datLibrary.getOrLoadArchive(key)
    var meta = await datLibrary.pullLatestArchiveMeta(archive)

    // select a default local path, if needed
    var localPath
    if (archive.writable) {
      try {
        let userSettings = await archivesDb.getUserSettings(0, key)
        localPath = userSettings.localPath
      } catch (e) {}
      localPath = localPath || await datLibrary.selectDefaultLocalPath(meta.title)
    }

    // update settings
    return archivesDb.setUserSettings(0, key, {isSaved: true, localPath})
  },

  async remove (url, {noPrompt} = {}) {
    var key = toKey(url)

    // check with the user if they're the owner
    var meta = await archivesDb.getMeta(key)
    if (meta.isOwner && !noPrompt) {
      var settings = await archivesDb.getUserSettings(0, key)
      var {shouldDelete, preserveStagingFolder} = await showDeleteArchivePrompt(meta.title || key, settings.localPath)
      if (!shouldDelete) {
        return settings
      }
    }

    // delete
    settings = await archivesDb.setUserSettings(0, key, {isSaved: false})
    if (settings.localPath && !preserveStagingFolder) {
      datLibrary.deleteOldStagingFolder(settings.localPath, {alwaysDelete: true})
    }
    return settings
  },

  async bulkRemove (urls) {
    var bulkShouldDelete = false
    var preserveStagingFolder = false
    // if user chooses yes-to-all, then preserveStagingFolder will be the last given value
    var results = []

    // sanity check
    if (!urls || !Array.isArray(urls)) {
      return []
    }

    for (var i = 0; i < urls.length; i++) {
      let key = toKey(urls[i])

      if (!bulkShouldDelete) {
        // check with the user if they're the owner
        let meta = await archivesDb.getMeta(key)
        if (meta.isOwner) {
          let settings = await archivesDb.getUserSettings(0, key)
          let res = await showDeleteArchivePrompt(meta.title || key, settings.localPath, {bulk: true})
          preserveStagingFolder = res.preserveStagingFolder

          if (res.bulkYesToAll) {
            // 'yes to all' chosen
            bulkShouldDelete = true
          } else if (!res.shouldDelete) {
            // 'no' chosen
            results.push(settings) // give settings unchanged
            continue
          }
        }
      }

      // delete
      let settings = await archivesDb.setUserSettings(0, key, {isSaved: false})
      if (settings.localPath && !preserveStagingFolder) {
        datLibrary.deleteOldStagingFolder(settings.localPath, {alwaysDelete: true})
      }
      results.push(settings)
    }
    return results
  },

  async restore (url) {
    var key = toKey(url)
    var settings = await archivesDb.getUserSettings(0, key)
    if (settings.localPath) {
      await datLibrary.restoreStagingFolder(key, settings.localPath)
      return true
    }
    return false
  },

  async list (query = {}) {
    return datLibrary.queryArchives(query)
  },

  async get (url, opts) {
    return timer(to(opts), async (checkin) => {
      return datLibrary.getArchiveInfo(toKey(url))
    })
  },

  async clearFileCache (url) {
    return datLibrary.clearFileCache(toKey(url))
  },

  clearDnsCache () {
    datDns.flushCache()
  },

  createEventStream () {
    return datLibrary.createEventStream()
  },

  createDebugStream () {
    return datLibrary.createDebugStream()
  }
}

async function assertSenderIsFocused (sender) {
  if (!sender.isFocused()) {
    throw new UserDeniedError('Application must be focused to spawn a prompt')
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
