import assert from 'assert'
import { URL } from 'url'
import * as followsAPI from '../../uwg/follows'
import * as sessionPerms from '../../lib/session-perms'

// typedefs
// =

/**
 * @typedef {Object} FollowsSitePublicAPIRecord
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 * @prop {string} type
 * @prop {boolean} isOwner
 *
 * @typedef {Object} FollowsPublicAPIRecord
 * @prop {FollowsSitePublicAPIRecord} author
 * @prop {FollowsSitePublicAPIRecord} topic
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
   * @returns {Promise<FollowsPublicAPIRecord[]>}
   */
  async list (opts) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/follows', 'read')
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
    var links = await followsAPI.list(opts)
    return Promise.all(links.map(massageFollowRecord))
  },

  /**
   * @param {string} author
   * @param {string} topic
   * @returns {Promise<FollowsPublicAPIRecord>}
   */
  async get (author, topic) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/follows', 'read')

    author = normalizeFollowUrl(author)
    topic = normalizeFollowUrl(topic)

    assert(author, 'The `author` parameter must be a valid URL')
    assert(topic, 'The `topic` parameter must be a valid URL')

    return followsAPI.get(author, topic)
  },

  /**
   * @param {string} topic
   * @param {Object} [opts]
   * @param {string} [opts.visibility]
   * @returns {Promise<void>}
   */
  async add (topic, opts) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/follows', 'write')
    var userArchive = await sessionPerms.getSessionUserArchive(this.sender)

    topic = normalizeFollowUrl(topic)
    if (!opts) opts = {}
    if (!opts.visibility) opts.visibility = 'public'
    assert(topic, 'The `topic` parameter must be a valid URL')
    assert(['public', 'private'].includes(opts.visibility), 'The `visibility` parameter must be "public" or "private"')

    await followsAPI.add(userArchive, topic, opts)
  },

  /**
   * @param {string} topic
   * @param {Object} [opts]
   * @param {string} [opts.visibility]
   * @returns {Promise<void>}
   */
  async edit (topic, opts) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/follows', 'write')
    var userArchive = await sessionPerms.getSessionUserArchive(this.sender)

    topic = normalizeFollowUrl(topic)
    if (!opts) opts = {}
    if (!opts.visibility) opts.visibility = 'public'
    assert(topic, 'The `topic` parameter must be a valid URL')
    assert(['public', 'private'].includes(opts.visibility), 'The `visibility` parameter must be "public" or "private"')

    await followsAPI.edit(userArchive, topic, opts)
  },

  /**
   * @param {string} topic
   * @returns {Promise<void>}
   */
  async remove (topic) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/follows', 'write')
    var userArchive = await sessionPerms.getSessionUserArchive(this.sender)

    topic = normalizeFollowUrl(topic)
    assert(topic, 'The `topic` parameter must be a valid URL')

    await followsAPI.remove(userArchive, topic)
  }
}

// internal methods
// =

/**
 * @param {string} url
 * @returns {string}
 */
function normalizeFollowUrl (url) {
  try {
    url = new URL(url)
    return url.protocol + '//' + url.hostname
  } catch (e) {}
  return null
}

/**
 * @param {Object} site
 * @returns {FollowsSitePublicAPIRecord}
 */
function massageSiteRecord (site) {
  if (!site) return null
  return {
    url: site.url,
    title: site.title,
    description: site.description,
    type: site.type,
    isOwner: site.isOwner
  }
}

/**
 * @param {Object} follow
 * @returns {FollowsPublicAPIRecord}
 */
function massageFollowRecord (follow) {
  return {
    author: massageSiteRecord(follow.author),
    topic: massageSiteRecord(follow.topic),
    visibility: follow.visibility
  }
}