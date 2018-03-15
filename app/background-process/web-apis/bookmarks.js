import assert from 'assert'
import normalizeUrl from 'normalize-url'
import {PermissionsError} from 'beaker-error-constants'
// import {getProfileArchive, getAPI} from '../ingests/profiles' TODO(profiles) disabled -prf
import * as privateBookmarksDb from '../dbs/bookmarks'
import {queryPermission} from '../ui/permissions'

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
    await assertPermission(this.sender, 'app:bookmarks:read')
    assertString(href, 'Parameter one must be a URL')
    href = normalizeUrl(href, NORMALIZE_OPTS)
    
    // TODO(profiles) disabled -prf
    // var archive = await getProfileArchive(0)
    // var bookmark = await getAPI().getBookmark(archive, href)
    // if (bookmark) return bookmark

    // check private db
    return privateBookmarksDb.getBookmark(0, href)
  },

  // check if bookmark exists in the current user's public & private data
  async isBookmarked (href) {
    await assertPermission(this.sender, 'app:bookmarks:read')
    assertString(href, 'Parameter one must be a URL')
    href = normalizeUrl(href, NORMALIZE_OPTS)

    // TODO(profiles) disabled -prf
    // var archive = await getProfileArchive(0)
    // var res = await getAPI().isBookmarked(archive, href)
    // if (res) return true

    // check private db
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
    throw new Error('Public bookmarks are temporarily disabled')
    // TODO(profiles) disabled -prf
    // await assertPermission(this.sender, 'app:bookmarks:edit-public')
    // assertString(href, 'Parameter one must be a URL')
    // href = normalizeUrl(href, NORMALIZE_OPTS)
    // var archive = await getProfileArchive(0)
    // await getAPI().bookmark(archive, href, data)
  },

  // delete public bookmark
  async unbookmarkPublic (href) {
    throw new Error('Public bookmarks are temporarily disabled')
    // TODO(profiles) disabled -prf
    // await assertPermission(this.sender, 'app:bookmarks:edit-public')
    // assertString(href, 'Parameter one must be a URL')
    // href = normalizeUrl(href, NORMALIZE_OPTS)
    // var archive = await getProfileArchive(0)
    // await getAPI().unbookmark(archive, href)
  },

  // list public bookmarks
  // - opts.author: url | DatArchive | Array<url | DatArchive>,
  // - opts.pinned: boolean
  // - opts.offset: number
  // - opts.limit: number
  // - opts.reverse: boolean
  // - opts.fetchAuthor: boolean
  async listPublicBookmarks (opts) {
    return []
    // TODO(profiles) disabled -prf
    // await assertPermission(this.sender, 'app:bookmarks:read')
    // return getAPI().listBookmarks(opts)
  },

  // pins
  // =

  // pin a bookmark (public or private)
  async setBookmarkPinned (href, pinned) {
    await assertPermission(this.sender, 'app:bookmarks:edit-private')
    assertString(href, 'Parameter one must be a URL')
    href = normalizeUrl(href, NORMALIZE_OPTS)

    // find which db it's in
    // TODO(profiles) disabled -prf
    // var archive = await getProfileArchive(0)
    // if (await getAPI().isBookmarked(archive, href)) {
    //   await getAPI().setBookmarkPinned(href, pinned)
    // } else {
      await privateBookmarksDb.setBookmarkPinned(0, href, pinned)
    // }
  },

  // list pinned bookmarks (public and private)
  async listPinnedBookmarks () {
    await assertPermission(this.sender, 'app:bookmarks:read')

    // TODO(profiles) disabled -prf
    // merge bookmarks from private DB
    // var archive = await getProfileArchive(0)
    // var bookmarks = await getAPI().listPinnedBookmarks(archive)
    // bookmarks = bookmarks.concat(await privateBookmarksDb.listPinnedBookmarks(0))
    // return bookmarks
    return privateBookmarksDb.listPinnedBookmarks(0)
  },

  // private
  // TODO replace this with private files in dat -prf
  // =

  // bookmark privately
  // - data.title: string
  async bookmarkPrivate (href, data = {}) {
    await assertPermission(this.sender, 'app:bookmarks:edit-private')
    assertString(href, 'Parameter one must be a URL')
    href = normalizeUrl(href, NORMALIZE_OPTS)
    await privateBookmarksDb.bookmark(0, href, data)
  },

  // delete private bookmark
  async unbookmarkPrivate (href) {
    await assertPermission(this.sender, 'app:bookmarks:edit-private')
    assertString(href, 'Parameter one must be a URL')
    href = normalizeUrl(href, NORMALIZE_OPTS)
    await privateBookmarksDb.unbookmark(0, href)
  },

  // list private bookmarks
  async listPrivateBookmarks (opts) {
    await assertPermission(this.sender, 'app:bookmarks:read')
    return privateBookmarksDb.listBookmarks(0, opts)
  },

  // tags
  // =

  async listBookmarkTags () {
    await assertPermission(this.sender, 'app:bookmarks:read')
    var [privateTags, publicTags] = await Promise.all([
      privateBookmarksDb.listBookmarkTags(0),
      [] // getAPI().listBookmarkTags() TODO(profiles) disabled -prf
    ])
    return Array.from(new Set(privateTags.concat(publicTags)))
  }
}

async function assertPermission (sender, perm) {
  if (sender.getURL().startsWith('beaker:')) {
    return true
  }
  if (await queryPermission(perm, sender)) return true
  throw new PermissionsError()
}

function assertString (v, msg) {
  assert(!!v && typeof v === 'string', msg)
}