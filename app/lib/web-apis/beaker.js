/* globals DatArchive */

import rpc from 'pauls-electron-rpc'
import {EventTarget, bindEventStream, fromEventStream} from './event-target'
import errors from 'beaker-error-constants'

import archivesManifest from '../api-manifests/internal/archives'
import bookmarksManifest from '../api-manifests/internal/bookmarks'
import historyManifest from '../api-manifests/internal/history'
import profilesManifest from '../api-manifests/internal/profiles'
import appsManifest from '../api-manifests/internal/apps'

var beaker = {}
if (window.location.protocol === 'beaker:') {
  const opts = {timeout: false, errors}
  const archivesRPC = rpc.importAPI('archives', archivesManifest, opts)
  const bookmarksRPC = rpc.importAPI('bookmarks', bookmarksManifest, opts)
  const historyRPC = rpc.importAPI('history', historyManifest, opts)
  const profilesRPC = rpc.importAPI('profiles', profilesManifest, opts)
  const appsRPC = rpc.importAPI('apps', appsManifest, opts)

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
  bindEventStream(archivesRPC.createEventStream(), beaker.archives)

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

  // beaker.history
  beaker.history = {}
  beaker.history.addVisit = historyRPC.addVisit
  beaker.history.getVisitHistory = historyRPC.getVisitHistory
  beaker.history.getMostVisited = historyRPC.getMostVisited
  beaker.history.search = historyRPC.search
  beaker.history.removeVisit = historyRPC.removeVisit
  beaker.history.removeAllVisits = historyRPC.removeAllVisits
  beaker.history.removeVisitsAfter = historyRPC.removeVisitsAfter

  // beaker.profiles
  beaker.profiles = {}
  beaker.profiles.getCurrentArchive = async () => {
    var url = await profilesRPC.getCurrentArchive()
    return new DatArchive(url)
  }
  beaker.profiles.getCurrentProfile = profilesRPC.getCurrentProfile
  beaker.profiles.setCurrentProfile = profilesRPC.setCurrentProfile
  beaker.profiles.setCurrentAvatar = profilesRPC.setCurrentAvatar
  beaker.profiles.getProfile = profilesRPC.getProfile
  beaker.profiles.setProfile = profilesRPC.setProfile
  beaker.profiles.setAvatar = profilesRPC.setAvatar
  beaker.profiles.follow = profilesRPC.follow
  beaker.profiles.unfollow = profilesRPC.unfollow
  beaker.profiles.listFollowers = profilesRPC.listFollowers
  beaker.profiles.countFollowers = profilesRPC.countFollowers
  beaker.profiles.listFriends = profilesRPC.listFriends
  beaker.profiles.countFriends = profilesRPC.countFriends
  beaker.profiles.isFollowing = profilesRPC.isFollowing
  beaker.profiles.isFriendsWith = profilesRPC.isFriendsWith

  // beaker.apps
  beaker.apps = {}
  beaker.apps.get = appsRPC.get
  beaker.apps.list = appsRPC.list
  beaker.apps.bind = appsRPC.bind
  beaker.apps.unbind = appsRPC.unbind
}

export default beaker
