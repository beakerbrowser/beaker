import assert from 'assert'
import {getProfileArchive, getAPI} from '../injests/profiles'
import * as privateBookmarksDb from '../dbs/bookmarks'
import normalizeUrl from 'normalize-url'

const NORMALIZE_OPTS = {
  stripFragment: false,
  stripWWW: false,
  removeQueryParameters: false
}

// exported api
// =

export default {

  // current user
  // =

  // fetch bookmark data from the current user's public & private data
  async getBookmark (href) {
    assertString(href, 'Parameter one must be a URL')
    href = normalizeUrl(href, NORMALIZE_OPTS)
    var archive = await getProfileArchive(0)
    var bookmark = await getAPI().getBookmark(archive, href)
    if (bookmark) return bookmark
    // TEMP check private db -prf
    return privateBookmarksDb.getBookmark(0, href)
  },

  // check if bookmark exists in the current user's public & private data
  async isBookmarked (href) {
    assertString(href, 'Parameter one must be a URL')
    href = normalizeUrl(href, NORMALIZE_OPTS)
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

  // public
  // =

  // bookmark publicly
  // - data.title: string
  async bookmarkPublic (href, data) {
    assertString(href, 'Parameter one must be a URL')
    href = normalizeUrl(href, NORMALIZE_OPTS)
    var archive = await getProfileArchive(0)
    await getAPI().bookmark(archive, href, data)
  },

  // delete public bookmark
  async unbookmarkPublic (href) {
    assertString(href, 'Parameter one must be a URL')
    href = normalizeUrl(href, NORMALIZE_OPTS)
    var archive = await getProfileArchive(0)

    await getAPI().unbookmark(archive, href)
  },

  // list public bookmarks
  // - opts.author: url | DatArchive | Array<url | DatArchive>,
  // - opts.pinned: boolean
  // - opts.offset: number
  // - opts.limit: number
  // - opts.reverse: boolean
  // - opts.fetchAuthor: boolean
  async listPublicBookmarks (opts) {
    return getAPI().listBookmarks(opts)
  },

  // pins
  // =

  // pin a bookmark (public or private)
  async setBookmarkPinned (href, pinned) {
    assertString(href, 'Parameter one must be a URL')
    href = normalizeUrl(href, NORMALIZE_OPTS)
    var archive = await getProfileArchive(0)
    // TEMP find which db it's in -prf
    if (await getAPI().isBookmarked(archive, href)) {
      await getAPI().setBookmarkPinned(href, pinned)
    } else {
      await privateBookmarksDb.setBookmarkPinned(0, href, pinned)
    }
  },

  // list pinned bookmarks (public and private)
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

  // bookmark privately
  // - data.title: string
  async bookmarkPrivate (href, data = {}) {
    assertString(href, 'Parameter one must be a URL')
    href = normalizeUrl(href, NORMALIZE_OPTS)
    await privateBookmarksDb.bookmark(0, href, data)
  },

  // delete private bookmark
  async unbookmarkPrivate (href) {
    assertString(href, 'Parameter one must be a URL')
    href = normalizeUrl(href, NORMALIZE_OPTS)
    await privateBookmarksDb.unbookmark(0, href)
  },

  // list private bookmarks
  async listPrivateBookmarks (opts) {
    return privateBookmarksDb.listBookmarks(0, opts)
  },

  // tags
  // =

  async listBookmarkTags () {
    var [privateTags, publicTags] = await Promise.all([
      privateBookmarksDb.listBookmarkTags(0),
      getAPI().listBookmarkTags(),
    ])
    return Array.from(new Set(privateTags.concat(publicTags)))
  }
}

function assertArchive (v, msg) {
  assert(!!v && (typeof v === 'string' || typeof v.url === 'string'), msg)
}

function assertString (v, msg) {
  assert(!!v && typeof v === 'string', msg)
}