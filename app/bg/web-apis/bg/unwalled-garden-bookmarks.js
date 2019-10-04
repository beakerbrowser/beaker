import assert from 'assert'
import * as bookmarksAPI from '../../uwg/bookmarks'
import * as filesystem from '../../filesystem/index'
import * as sessionPerms from '../../lib/session-perms'

// typedefs
// =

/**
 * @typedef {import('../../uwg/bookmarks').Bookmark} Bookmark
 *
 * @typedef {Object} BookmarkAuthorPublicAPIRecord
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 * @prop {string} type
 * @prop {boolean} isOwner
 *
 * @typedef {Object} BookmarkPublicAPIRecord
 * @prop {string} href
 * @prop {string} title
 * @prop {string} description
 * @prop {string[]} tags
 * @prop {number} createdAt
 * @prop {BookmarkAuthorPublicAPIRecord} author
 * @prop {string} visibility
 */

// exported api
// =

export default {
  /**
   * @param {Object} [opts]
   * @param {string|string[]} [opts.author]
   * @param {string|string[]} [opts.tag]
   * @param {string} [opts.visibility]
   * @param {string} [opts.sortBy] - 'title' or 'createdAt' (default 'title')
   * @param {number} [opts.offset] - default 0
   * @param {number} [opts.limit]
   * @param {boolean} [opts.reverse]
   * @returns {Promise<BookmarkPublicAPIRecord[]>}
   */
  async list (opts) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/bookmarks', 'read')
    opts = (opts && typeof opts === 'object') ? opts : {}
    if (typeof opts.sortBy !== 'undefined') assert(typeof opts.sortBy === 'string', 'SortBy must be a string')
    if (typeof opts.offset !== 'undefined') assert(typeof opts.offset === 'number', 'Offset must be a number')
    if (typeof opts.limit !== 'undefined') assert(typeof opts.limit === 'number', 'Limit must be a number')
    if (typeof opts.reverse !== 'undefined') assert(typeof opts.reverse === 'boolean', 'Reverse must be a boolean')
    if (typeof opts.author !== 'undefined') {
      if (Array.isArray(opts.author)) {
        assert(opts.author.every(v => typeof v === 'string'), 'Author filter must be a string or array of strings')
      } else {
        assert(typeof opts.author === 'string', 'Author filter must be a string or array of strings')
      }
    }
    if (typeof opts.tag !== 'undefined') {
      if (Array.isArray(opts.tag)) {
        assert(opts.tag.every(v => typeof v === 'string'), 'Tag filter must be a string or array of strings')
      } else {
        assert(typeof opts.tag === 'string', 'Tag filter must be a string or array of strings')
      }
    }
    if (typeof opts.visibility !== 'undefined') {
      assert(typeof opts.visibility === 'string', 'Visibility filter must be a string')
    }

    var bookmarks = await bookmarksAPI.list(opts)
    return Promise.all(bookmarks.map(massageBookmarkRecord))
  },

  /**
   * @param {string} author
   * @param {string} href
   * @returns {Promise<BookmarkPublicAPIRecord>}
   */
  async get (author, href) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/bookmarks', 'read')
    assert(author && typeof author === 'string', 'The `author` parameter must be a string')
    assert(href && typeof href === 'string', 'The `href` parameter must be a string')
    return massageBookmarkRecord(await bookmarksAPI.getBookmarkByHref(author, href))
  },

  /**
   * @param {string} href
   * @returns {Promise<BookmarkPublicAPIRecord>}
   */
  async getOwn (href) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/bookmarks', 'read')
    assert(href && typeof href === 'string', 'The `href` parameter must be a string')
    var userArchive = await sessionPerms.getSessionUserArchive(this.sender)
    return massageBookmarkRecord(await bookmarksAPI.getOwnBookmarkByHref(userArchive, href))
  },

  /**
   * @param {Object} bookmark
   * @param {string} bookmark.href
   * @param {string} bookmark.title
   * @param {string} [bookmark.description]
   * @param {string | string[]} [bookmark.tags]
   * @param {string} [bookmark.visibility]
   * @returns {Promise<BookmarkPublicAPIRecord>}
   */
  async add (bookmark) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/bookmarks', 'write')

    assert(bookmark && typeof bookmark === 'object', 'The `bookmark` parameter must be an object')
    assert(bookmark.href && typeof bookmark.href === 'string', 'The `bookmark.href` parameter must be a non-empty string')
    assert(bookmark.title && typeof bookmark.title === 'string', 'The `bookmark.title` parameter must be a non-empty string')
    if ('description' in bookmark) assert(typeof bookmark.description === 'string', 'The `bookmark.description` parameter must be a string')
    if ('tags' in bookmark) assert(typeof bookmark.tags === 'string' || isArrayOfStrings(bookmark.tags), 'The `bookmark.tags` parameter must be a string or array of strings')
    if ('visibility' in bookmark) assert(typeof bookmark.visibility === 'string', 'The `bookmark.visibility` parameter must be "public" or "private"')

    // default values
    var visibility = bookmark.visibility || 'public'
    delete bookmark.visibility

    var author = visibility === 'private'
      ? filesystem.get()
      : await sessionPerms.getSessionUserArchive(this.sender)
    var url = await bookmarksAPI.addBookmark(author, bookmark)
    return massageBookmarkRecord(await bookmarksAPI.getBookmarkByHref(author, url))
  },

  /**
   * @param {string} href
   * @param {Object} bookmark
   * @param {string} [bookmark.href]
   * @param {string} [bookmark.title]
   * @param {string} [bookmark.description]
   * @param {string | string[]} [bookmark.tags]
   * @param {string} [bookmark.visibility]
   * @returns {Promise<BookmarkPublicAPIRecord>}
   */
  async edit (href, bookmark = {}) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/bookmarks', 'write')
    var userArchive = await sessionPerms.getSessionUserArchive(this.sender)

    assert(bookmark && typeof bookmark === 'object', 'The `bookmark` parameter must be an object')
    if ('href' in bookmark) assert(bookmark.href && typeof bookmark.href === 'string', 'The `bookmark.href` parameter must be a string')
    if ('title' in bookmark) assert(bookmark.title && typeof bookmark.title === 'string', 'The `bookmark.title` parameter must be a string')
    if ('description' in bookmark) assert(typeof bookmark.description === 'string', 'The `bookmark.description` parameter must be a string')
    if ('tags' in bookmark) assert(typeof bookmark.tags === 'string' || isArrayOfStrings(bookmark.tags), 'The `bookmark.tags` parameter must be a string or array of strings')
    if ('visibility' in bookmark) assert(typeof bookmark.visibility === 'string', 'The `bookmark.visibility` parameter must be "public" or "private"')

    // find the existing bookmark
    var [existingPrivate, existingPublic] = await Promise.all([
      bookmarksAPI.getBookmarkByHref(filesystem.get().url, href),
      bookmarksAPI.getBookmarkByHref(userArchive.url, href)
    ])
    if (!existingPrivate && !existingPublic) {
      throw new Error('Bookmark does not exist')
    }

    // carry over past values
    bookmark = Object.assign(existingPrivate || existingPublic, bookmark)

    // remove old and add new
    // (we do it this way rather than modifying in place to handle when visibility changes, which changes where the bookmark is saved)
    await module.exports.remove.call(this, href)
    return module.exports.add.call(this, {
      href: bookmark.href,
      title: bookmark.title,
      description: bookmark.description,
      tags: bookmark.tags,
      visibility: bookmark.visibility
    })
  },

  /**
   * @param {string} href
   * @returns {Promise<void>}
   */
  async remove (href) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/bookmarks', 'write')
    var userArchive = await sessionPerms.getSessionUserArchive(this.sender)

    assert(href && typeof href === 'string', 'The `href` parameter must be a string')

    await Promise.all([
      bookmarksAPI.removeBookmarkByHref(filesystem.get(), href),
      bookmarksAPI.removeBookmarkByHref(userArchive, href)
    ])
  }
}

// internal methods
// =

function isArrayOfStrings (v) {
  return Array.isArray(v) && v.every(item => typeof item === 'string')
}

/**
 * @param {Bookmark} bookmark
 * @returns {BookmarkPublicAPIRecord}
 */
function massageBookmarkRecord (bookmark) {
  if (!bookmark) return null
  return {
    href: bookmark.href,
    title: bookmark.title,
    description: bookmark.description,
    tags: bookmark.tags,
    createdAt: bookmark.createdAt,
    author: {
      url: bookmark.author.url,
      title: bookmark.author.title,
      description: bookmark.author.description,
      type: bookmark.author.type,
      isOwner: bookmark.author.isOwner
    },
    visibility: bookmark.visibility
  }
}
