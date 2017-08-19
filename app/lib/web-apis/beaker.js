/* globals DatArchive */

import rpc from 'pauls-electron-rpc'
import {EventTarget, bindEventStream, fromEventStream} from './event-target'
import errors from 'beaker-error-constants'

import archivesManifest from '../api-manifests/internal/archives'
import bookmarksManifest from '../api-manifests/internal/bookmarks'
import historyManifest from '../api-manifests/internal/history'
import profilesManifest from '../api-manifests/internal/profiles'

var beaker = {}
if (window.location.protocol === 'beaker:') {
  var opts = {timeout: false, errors}
  const archivesRPC = rpc.importAPI('archives', archivesManifest, opts)
  const bookmarksRPC = rpc.importAPI('bookmarks', bookmarksManifest, opts)
  const historyRPC = rpc.importAPI('history', historyManifest, opts)
  const profilesRPC = rpc.importAPI('profiles', profilesManifest, opts)

  // beaker.archives
  beaker.archives = new EventTarget()
  beaker.archives.create = function (manifest = {}, userSettings = {}) {
    return archivesRPC.create(manifest, userSettings).then(newUrl => new DatArchive(newUrl))
  }
  beaker.archives.fork = function (url, manifest = {}, userSettings = {}) {
    url = (typeof url.url === 'string') ? url.url : url
    return archivesRPC.fork(url, manifest, userSettings).then(newUrl => new DatArchive(newUrl))
  }
  beaker.archives.status = archivesRPC.status
  beaker.archives.add = archivesRPC.add
  beaker.archives.remove = archivesRPC.remove
  beaker.archives.bulkRemove = archivesRPC.bulkRemove
  beaker.archives.restore = archivesRPC.restore
  beaker.archives.update = archivesRPC.update
  beaker.archives.list = archivesRPC.list
  beaker.archives.get = archivesRPC.get
  beaker.archives.clearFileCache = archivesRPC.clearFileCache
  beaker.archives.clearDnsCache = archivesRPC.clearDnsCache
  beaker.archives.createDebugStream = () => fromEventStream(archivesRPC.createDebugStream())
  bindEventStream(archivesRPC.createEventStream(), beaker.archives)

  // beaker.bookmarks
  beaker.bookmarks = new EventTarget()
  beaker.bookmarks.bookmark = bookmarksRPC.bookmark
  beaker.bookmarks.unbookmark = bookmarksRPC.unbookmark
  beaker.bookmarks.listBookmarks = bookmarksRPC.listBookmarks
  beaker.bookmarks.getBookmark = bookmarksRPC.getBookmark
  beaker.bookmarks.isBookmarked = bookmarksRPC.isBookmarked
  beaker.bookmarks.setBookmarkPinned = bookmarksRPC.setBookmarkPinned
  beaker.bookmarks.listPinnedBookmarks = bookmarksRPC.listPinnedBookmarks
  beaker.bookmarks.bookmarkPrivate = bookmarksRPC.bookmarkPrivate
  beaker.bookmarks.unbookmarkPrivate = bookmarksRPC.unbookmarkPrivate
  beaker.bookmarks.listPrivateBookmarks = bookmarksRPC.listPrivateBookmarks
  beaker.bookmarks.getPrivateBookmark = bookmarksRPC.getPrivateBookmark
  // bindEventStream(bookmarksRPC.createEventStream(), beaker.bookmarks) TODO

  // beaker.history
  beaker.history = new EventTarget()
  beaker.history.addVisit = historyRPC.addVisit
  beaker.history.getVisitHistory = historyRPC.getVisitHistory
  beaker.history.getMostVisited = historyRPC.getMostVisited
  beaker.history.search = historyRPC.search
  beaker.history.removeVisit = historyRPC.removeVisit
  beaker.history.removeAllVisits = historyRPC.removeAllVisits
  beaker.history.removeVisitsAfter = historyRPC.removeVisitsAfter
  // bindEventStream(historyRPC.createEventStream(), beaker.history) TODO

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
  // bindEventStream(profilesRPC.createEventStream(), beaker.profiles) TODO
}

export default beaker
