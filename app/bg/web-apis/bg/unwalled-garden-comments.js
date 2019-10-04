import assert from 'assert'
import { URL } from 'url'
import dat from '../../dat/index'
import * as commentsAPI from '../../uwg/comments'
import * as sessionPerms from '../../lib/session-perms'

// typedefs
// =

/**
 * @typedef {Object} CommentAuthorPublicAPIRecord
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 * @prop {string} type
 * @prop {boolean} isOwner
 *
 * @typedef {Object} CommentPublicAPIRecord
 * @prop {string} url
 * @prop {string} topic
 * @prop {string} replyTo
 * @prop {string} body
 * @prop {string} createdAt
 * @prop {string} updatedAt
 * @prop {CommentAuthorPublicAPIRecord} author
 * @prop {string} visibility
 *
 * @typedef {Object} ThreadedCommentPublicAPIRecord
 * @prop {string} url
 * @prop {string} topic
 * @prop {string} replyTo
 * @prop {string} body
 * @prop {ThreadedCommentPublicAPIRecord[]} replies
 * @prop {number} replyCount
 * @prop {string} createdAt
 * @prop {string} updatedAt
 * @prop {CommentAuthorPublicAPIRecord} author
 * @prop {string} visibility
 */

// exported api
// =

export default {
  /**
   * @param {Object} [opts]
   * @param {string|string[]} [opts.author]
   * @param {string|string[]} [opts.topic]
   * @param {string} [opts.visibility]
   * @param {string} [opts.sortBy]
   * @param {number} [opts.offset=0]
   * @param {number} [opts.limit]
   * @param {boolean} [opts.reverse]
   * @returns {Promise<CommentPublicAPIRecord[]>}
   */
  async list (opts) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/comments', 'read')
    opts = (opts && typeof opts === 'object') ? opts : {}
    if ('sortBy' in opts) assert(typeof opts.sortBy === 'string', 'SortBy must be a string')
    if ('offset' in opts) assert(typeof opts.offset === 'number', 'Offset must be a number')
    if ('limit' in opts) assert(typeof opts.limit === 'number', 'Limit must be a number')
    if ('reverse' in opts) assert(typeof opts.reverse === 'boolean', 'Reverse must be a boolean')
    if ('author' in opts) {
      if (Array.isArray(opts.author)) {
        assert(opts.author.every(v => typeof v === 'string'), 'Author filter must be a string or array of strings')
      } else {
        assert(typeof opts.author === 'string', 'Author filter must be a string or array of strings')
      }
    }
    if ('topic' in opts) {
      if (Array.isArray(opts.topic)) {
        assert(opts.topic.every(v => typeof v === 'string'), 'Topic filter must be a string or array of strings')
      } else {
        assert(typeof opts.topic === 'string', 'Topic filter must be a string or array of strings')
      }
    }
    if ('visibility' in opts) {
      assert(typeof opts.visibility === 'string', 'Visibility filter must be a string')
    }

    var comments = await commentsAPI.list(opts)
    return Promise.all(comments.map(massageCommentRecord))
  },

  /**
   * @param {string} topic
   * @param {Object} [opts]
   * @param {string|string[]} [opts.author]
   * @param {string} [opts.visibility]
   * @param {string} [opts.parent]
   * @param {number} [opts.depth]
   * @param {string} [opts.sortBy]
   * @param {boolean} [opts.reverse]
   * @returns {Promise<CommentPublicAPIRecord[]>}
   */
  async thread (topic, opts) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/comments', 'read')
    opts = (opts && typeof opts === 'object') ? opts : {}
    assert(topic && typeof topic === 'string', 'The `topic` parameter must be a URL string')
    if ('parent' in opts) assert(typeof opts.parent === 'string', 'Parent must be a string')
    if ('depth' in opts) assert(typeof opts.depth === 'number', 'Depth must be a number')
    if ('sortBy' in opts) assert(typeof opts.sortBy === 'string', 'SortBy must be a string')
    if ('reverse' in opts) assert(typeof opts.reverse === 'boolean', 'Reverse must be a boolean')
    if ('author' in opts) {
      if (Array.isArray(opts.author)) {
        assert(opts.author.every(v => typeof v === 'string'), 'Author filter must be a string or array of strings')
      } else {
        assert(typeof opts.author === 'string', 'Author filter must be a string or array of strings')
      }
    }
    if ('visibility' in opts) {
      assert(typeof opts.visibility === 'string', 'Visibility filter must be a string')
    }

    var comments = await commentsAPI.thread(topic, opts)
    return Promise.all(comments.map(massageThreadedCommentRecord))
  },

  /**
   * @param {string} url
   * @returns {Promise<CommentPublicAPIRecord>}
   */
  async get (url) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/comments', 'read')
    return massageCommentRecord(await commentsAPI.get(url))
  },

  /**
   * @param {Object|string} comment
   * @param {string} topic
   * @param {string} comment.replyTo
   * @param {string} comment.body
   * @param {string} [comment.visibility]
   * @returns {Promise<CommentPublicAPIRecord>}
   */
  async add (topic, comment) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/comments', 'write')
    var userArchive = await sessionPerms.getSessionUserArchive(this.sender)

    // string usage
    if (typeof comment === 'string') {
      comment = {body: comment}
    }

    assert(topic && typeof topic === 'string', 'The `topic` parameter must be a URL string')
    assert(comment && typeof comment === 'object', 'The `comment` parameter must be a string or object')
    assert(comment.body && typeof comment.body === 'string', 'The `comment.body` parameter must be a non-empty string')
    if ('replyTo' in comment) assert(typeof comment.replyTo === 'string', 'The `comment.replyTo` parameter must be a string')
    if ('visibility' in comment) assert(typeof comment.visibility === 'string', 'The `comment.visibility` parameter must be "public" or "private"')

    // default values
    if (!comment.visibility) {
      comment.visibility = 'public'
    }

    var url = await commentsAPI.add(userArchive, topic, comment)
    return massageCommentRecord(await commentsAPI.get(url))
  },

  /**
   * @param {string} url
   * @param {Object|string} comment
   * @param {string} comment.replyTo
   * @param {string} comment.body
   * @param {string} [comment.visibility]
   * @returns {Promise<CommentPublicAPIRecord>}
   */
  async edit (url, comment) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/comments', 'write')
    var userArchive = await sessionPerms.getSessionUserArchive(this.sender)

    // string usage
    if (typeof comment === 'string') {
      comment = {body: comment}
    }

    assert(url && typeof url === 'string', 'The `url` parameter must be a valid URL')
    assert(comment && typeof comment === 'object', 'The `comment` parameter must be a string or object')
    if ('body' in comment) assert(typeof comment.body === 'string', 'The `comment.body` parameter must be a string')
    if ('replyTo' in comment) assert(typeof comment.replyTo === 'string', 'The `comment.replyTo` parameter must be a string')
    if ('visibility' in comment) assert(typeof comment.visibility === 'string', 'The `comment.visibility` parameter must be "public" or "private"')

    var filepath = await urlToFilepath(url, userArchive.url)
    await commentsAPI.edit(userArchive, filepath, comment)
    return massageCommentRecord(await commentsAPI.get(userArchive.url + filepath))
  },

  /**
   * @param {string} url
   * @returns {Promise<void>}
   */
  async remove (url) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/comments', 'write')
    var userArchive = await sessionPerms.getSessionUserArchive(this.sender)

    assert(url && typeof url === 'string', 'The `url` parameter must be a valid URL')

    var filepath = await urlToFilepath(url, userArchive.url)
    await commentsAPI.remove(userArchive, filepath)
  }
}

// internal methods
// =

/**
 * Tries to parse the URL and return the pathname. If fails, assumes the string was a pathname.
 * @param {string} url
 * @returns {Promise<string>}
 */
async function urlToFilepath (url, origin) {
  var urlp
  var filepath
  try {
    // if `url` is a full URL, extract the path
    urlp = new URL(url)
    filepath = urlp.pathname
  } catch (e) {
    // assume `url` is a path
    return url
  }

  // double-check the origin
  var key = await dat.dns.resolveName(urlp.hostname)
  var urlp2 = new URL(origin)
  if (key !== urlp2.hostname) {
    throw new Error('Unable to edit comments on other sites than your own')
  }

  return filepath
}

/**
 * @param {Object} comment
 * @returns {CommentPublicAPIRecord}
 */
function massageCommentRecord (comment) {
  if (!comment) return null
  var url =  comment.author.url + comment.pathname
  return {
    url,
    topic: comment.topic,
    replyTo: comment.replyTo,
    body: comment.body,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: {
      url: comment.author.url,
      title: comment.author.title,
      description: comment.author.description,
      type: comment.author.type
    },
    visibility: comment.visibility
  }
}

/**
 * @param {Object} comment
 * @returns {ThreadedCommentPublicAPIRecord}
 */
function massageThreadedCommentRecord (comment) {
  if (!comment) return null
  var url =  comment.author.url + comment.pathname
  return {
    url,
    topic: comment.topic,
    replyTo: comment.replyTo,
    body: comment.body,
    replies: comment.replies ? comment.replies.map(massageThreadedCommentRecord) : null,
    replyCount: comment.replyCount,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: {
      url: comment.author.url,
      title: comment.author.title,
      description: comment.author.description,
      type: comment.author.type
    },
    visibility: comment.visibility
  }
}
