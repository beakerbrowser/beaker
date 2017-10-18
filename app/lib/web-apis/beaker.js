/* globals DatArchive */

import rpc from 'pauls-electron-rpc'
import {EventTarget, bindEventStream, fromEventStream} from './event-target'
import errors from 'beaker-error-constants'

import profilesManifest from '../api-manifests/external/profiles'
import bookmarksManifest from '../api-manifests/external/bookmarks'
import timelineManifest from '../api-manifests/external/timeline'

import archivesManifest from '../api-manifests/internal/archives'
import historyManifest from '../api-manifests/internal/history'
import downloadsManifest from '../api-manifests/internal/downloads'
import appsManifest from '../api-manifests/internal/apps'
import workspacesManifest from '../api-manifests/internal/workspaces'
import sitedataManifest from '../api-manifests/internal/sitedata'
import beakerBrowserManifest from '../api-manifests/internal/browser'

const beaker = {}
const opts = {timeout: false, errors}
const bookmarksRPC = rpc.importAPI('bookmarks', bookmarksManifest, opts)
const profilesRPC = rpc.importAPI('profiles', profilesManifest, opts)
const timelineRPC = rpc.importAPI('timeline', timelineManifest, opts)

// beaker.bookmarks
beaker.bookmarks = {}
beaker.bookmarks.getBookmark = bookmarksRPC.getBookmark
beaker.bookmarks.isBookmarked = bookmarksRPC.isBookmarked
beaker.bookmarks.bookmarkPublic = bookmarksRPC.bookmarkPublic
beaker.bookmarks.unbookmarkPublic = bookmarksRPC.unbookmarkPublic
beaker.bookmarks.listPublicBookmarks = bookmarksRPC.listPublicBookmarks
beaker.bookmarks.setBookmarkPinned = bookmarksRPC.setBookmarkPinned
beaker.bookmarks.listPinnedBookmarks = bookmarksRPC.listPinnedBookmarks
beaker.bookmarks.bookmarkPrivate = bookmarksRPC.bookmarkPrivate
beaker.bookmarks.unbookmarkPrivate = bookmarksRPC.unbookmarkPrivate
beaker.bookmarks.listPrivateBookmarks = bookmarksRPC.listPrivateBookmarks
beaker.bookmarks.listBookmarkTags = bookmarksRPC.listBookmarkTags

// beaker.profiles
beaker.profiles = {}
beaker.profiles.getCurrentUserArchive = async () => {
  var url = await profilesRPC.getCurrentUserArchive()
  return new DatArchive(url)
}
beaker.profiles.getCurrentUserProfile = profilesRPC.getCurrentUserProfile
beaker.profiles.setCurrentUserProfile = profilesRPC.setCurrentUserProfile
beaker.profiles.setCurrentUserAvatar = profilesRPC.setCurrentUserAvatar
beaker.profiles.getUserProfile = profilesRPC.getUserProfile
beaker.profiles.follow = profilesRPC.follow
beaker.profiles.unfollow = profilesRPC.unfollow
beaker.profiles.listFollowers = profilesRPC.listFollowers
beaker.profiles.countFollowers = profilesRPC.countFollowers
beaker.profiles.listFriends = profilesRPC.listFriends
beaker.profiles.countFriends = profilesRPC.countFriends
beaker.profiles.isFollowing = profilesRPC.isFollowing
beaker.profiles.isFriendsWith = profilesRPC.isFriendsWith

// beaker.timeline
beaker.timeline = {}
beaker.timeline.getPost = timelineRPC.getPost
beaker.timeline.listPosts = timelineRPC.listPosts
beaker.timeline.countPosts = timelineRPC.countPosts
beaker.timeline.post = timelineRPC.post
beaker.timeline.vote = timelineRPC.vote

// internal only
if (window.location.protocol === 'beaker:') {
  const historyRPC = rpc.importAPI('history', historyManifest, opts)
  const archivesRPC = rpc.importAPI('archives', archivesManifest, opts)
  const appsRPC = rpc.importAPI('apps', appsManifest, opts)
  const workspacesRPC = rpc.importAPI('workspaces', workspacesManifest, opts)
  const downloadsRPC = rpc.importAPI('downloads', downloadsManifest, opts)
  const sitedataRPC = rpc.importAPI('sitedata', sitedataManifest, opts)
  const beakerBrowserRPC = rpc.importAPI('beaker-browser', beakerBrowserManifest, opts)

  // beaker.archives
  beaker.archives = new EventTarget()
  beaker.archives.status = archivesRPC.status
  beaker.archives.add = archivesRPC.add
  beaker.archives.remove = archivesRPC.remove
  beaker.archives.bulkRemove = archivesRPC.bulkRemove
  beaker.archives.list = archivesRPC.list
  beaker.archives.publish = archivesRPC.publish
  beaker.archives.unpublish = archivesRPC.unpublish
  beaker.archives.listPublished = archivesRPC.listPublished
  beaker.archives.countPublished = archivesRPC.countPublished
  beaker.archives.getPublishRecord = archivesRPC.getPublishRecord
  beaker.archives.clearFileCache = archivesRPC.clearFileCache
  beaker.archives.clearDnsCache = archivesRPC.clearDnsCache
  beaker.archives.createDebugStream = () => fromEventStream(archivesRPC.createDebugStream())
  try {
    bindEventStream(archivesRPC.createEventStream(), beaker.archives)
  } catch (e) {
    // permissions error
  }

  // beaker.history
  beaker.history = {}
  beaker.history.addVisit = historyRPC.addVisit
  beaker.history.getVisitHistory = historyRPC.getVisitHistory
  beaker.history.getMostVisited = historyRPC.getMostVisited
  beaker.history.search = historyRPC.search
  beaker.history.removeVisit = historyRPC.removeVisit
  beaker.history.removeAllVisits = historyRPC.removeAllVisits
  beaker.history.removeVisitsAfter = historyRPC.removeVisitsAfter

  // beaker.apps
  beaker.apps = {}
  beaker.apps.get = appsRPC.get
  beaker.apps.list = appsRPC.list
  beaker.apps.bind = appsRPC.bind
  beaker.apps.unbind = appsRPC.unbind
  beaker.apps.runInstaller = appsRPC.runInstaller
  beaker.apps.createEventsStream = () => fromEventStream(appsRPC.createEventsStream())

  // beaker.workspaces
  beaker.workspaces = {}
  beaker.workspaces.list = workspacesRPC.list
  beaker.workspaces.get = workspacesRPC.get
  beaker.workspaces.set = workspacesRPC.set
  beaker.workspaces.remove = workspacesRPC.remove
  beaker.workspaces.listChangedFiles = workspacesRPC.listChangedFiles
  beaker.workspaces.diff = workspacesRPC.diff
  beaker.workspaces.publish = workspacesRPC.publish
  beaker.workspaces.revert = workspacesRPC.revert

  // beaker.downloads
  beaker.downloads = {}
  beaker.downloads.getDownloads = downloadsRPC.getDownloads
  beaker.downloads.pause = downloadsRPC.pause
  beaker.downloads.resume = downloadsRPC.resume
  beaker.downloads.cancel = downloadsRPC.cancel
  beaker.downloads.remove = downloadsRPC.remove
  beaker.downloads.open = downloadsRPC.open
  beaker.downloads.showInFolder = downloadsRPC.showInFolder
  beaker.downloads.createEventsStream = () => fromEventStream(downloadsRPC.createEventsStream())

  // beaker.sitedata
  beaker.sitedata = {}
  beaker.sitedata.get = sitedataRPC.get
  beaker.sitedata.set = sitedataRPC.set
  beaker.sitedata.getPermissions = sitedataRPC.getPermissions
  beaker.sitedata.getAppPermissions = sitedataRPC.getAppPermissions
  beaker.sitedata.getPermission = sitedataRPC.getPermission
  beaker.sitedata.setPermission = sitedataRPC.setPermission
  beaker.sitedata.setAppPermissions = sitedataRPC.setAppPermissions
  beaker.sitedata.clearPermission = sitedataRPC.clearPermission
  beaker.sitedata.clearPermissionAllOrigins = sitedataRPC.clearPermissionAllOrigins

  // beaker.browser
  beaker.browser = {}
  beaker.browser.createEventsStream = () => fromEventStream(beakerBrowserRPC.createEventsStream())
  beaker.browser.getInfo = beakerBrowserRPC.getInfo
  beaker.browser.checkForUpdates = beakerBrowserRPC.checkForUpdates
  beaker.browser.restartBrowser = beakerBrowserRPC.restartBrowser
  beaker.browser.getSettings = beakerBrowserRPC.getSettings
  beaker.browser.getSetting = beakerBrowserRPC.getSetting
  beaker.browser.setSetting = beakerBrowserRPC.setSetting
  beaker.browser.getUserSetupStatus = beakerBrowserRPC.getUserSetupStatus
  beaker.browser.setUserSetupStatus = beakerBrowserRPC.setUserSetupStatus
  beaker.browser.getDefaultProtocolSettings = beakerBrowserRPC.getDefaultProtocolSettings
  beaker.browser.setAsDefaultProtocolClient = beakerBrowserRPC.setAsDefaultProtocolClient
  beaker.browser.removeAsDefaultProtocolClient = beakerBrowserRPC.removeAsDefaultProtocolClient
  beaker.browser.fetchBody = beakerBrowserRPC.fetchBody
  beaker.browser.downloadURL = beakerBrowserRPC.downloadURL
  beaker.browser.setBrowserWindowSize = beakerBrowserRPC.setBrowserWindowSize
  beaker.browser.setStartPageBackgroundImage = beakerBrowserRPC.setStartPageBackgroundImage
  beaker.browser.showContextMenu = beakerBrowserRPC.showContextMenu
  beaker.browser.showOpenDialog = beakerBrowserRPC.showOpenDialog
  beaker.browser.openUrl = beakerBrowserRPC.openUrl
  beaker.browser.openFolder = beakerBrowserRPC.openFolder
  beaker.browser.doWebcontentsCmd = beakerBrowserRPC.doWebcontentsCmd
  beaker.browser.closeModal = beakerBrowserRPC.closeModal
}

export default beaker
