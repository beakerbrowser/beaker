import assert from 'assert'
import {getProfileArchive, getAPI} from '../injests/profiles'
import * as privateBookmarksDb from '../dbs/bookmarks'

// exported api
// =

export default {

  // public
  // =

  async bookmark (archive, href, data) {
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    assertString(href, 'Parameter two must be a URL')
    return getAPI().bookmark(archive, href, data)
  },

  async unbookmark (archive, href) {
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    assertString(href, 'Parameter two must be a URL')
    return getAPI().unbookmark(archive, href)
  },

  async listBookmarks (opts) {
    return getAPI().listBookmarks(opts)
  },

  async getBookmark (archive, href) {
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    assertString(href, 'Parameter two must be a URL')
    return getAPI().getBookmark(archive, href)
  },

  async isBookmarked (href) {
    assertString(href, 'Parameter one must be a URL')
    var archive = await getProfileArchive(0)
    var res = await getAPI().isBookmarked(archive, href)
    if (res) return true
    // TEMP check private db -prf
    try {
      var bookmark = await privateBookmarksDb.getBookmark(0, href)
      return !!bookmark
    } catch (e) {
      return false
    }
  },

  async setBookmarkPinned (archive, href, pinned) {
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    assertString(href, 'Parameter two must be a URL')
    // TEMP find which db it's in -prf
    if (await getAPI().isBookmarked(archive, href)) {
      return getAPI().setBookmarkPinned(href, pinned)
    } else {
      return privateBookmarksDb.setBookmarkPinned(0, href, pinned)
    }
  },

  async listPinnedBookmarks () {
    // TEMP merge bookmarks from private DB
    var archive = await getProfileArchive(0)
    var bookmarks = await getAPI().listPinnedBookmarks(archive)
    bookmarks = bookmarks.concat(await privateBookmarksDb.listPinnedBookmarks(0))
    return bookmarks
  },

  // private
  // TODO replace this with private files in dat -prf
  // =

  async bookmarkPrivate (href, data) {
    assertString(href, 'Parameter one must be a URL')
    return privateBookmarksDb.bookmark(0, href, data)
  },

  async unbookmarkPrivate (href) {
    assertString(href, 'Parameter one must be a URL')
    return privateBookmarksDb.unbookmark(0, href)
  },

  async listPrivateBookmarks (opts) {
    return privateBookmarksDb.listBookmarks(0, opts)
  },

  async getPrivateBookmark (href) {
    assertString(href, 'Parameter one must be a URL')
    return privateBookmarksDb.getBookmark(0, href)
  }
}

function assertArchive (v, msg) {
  assert(!!v && (typeof v === 'string' || typeof v.url === 'string'), msg)
}

function assertString (v, msg) {
  assert(!!v && typeof v === 'string', msg)
}