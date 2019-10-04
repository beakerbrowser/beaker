import assert from 'assert'
import { URL } from 'url'
import dat from '../../dat/index'
import * as statusesAPI from '../../uwg/statuses'
import * as sessionPerms from '../../lib/session-perms'

// typedefs
// =

/**
 * @typedef {Object} StatusAuthorPublicAPIRecord
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 * @prop {string} type
 * @prop {boolean} isOwner
 *
 * @typedef {Object} StatusPublicAPIRecord
 * @prop {string} url
 * @prop {string} body
 * @prop {string} createdAt
 * @prop {string} updatedAt
 * @prop {StatusAuthorPublicAPIRecord} author
 * @prop {string} visibility
 */

// exported api
// =

export default {
  /**
   * @param {Object} [opts]
   * @param {string|string[]} [opts.author]
   * @param {string} [opts.visibility]
   * @param {string} [opts.sortBy]
   * @param {number} [opts.offset=0]
   * @param {number} [opts.limit]
   * @param {boolean} [opts.reverse]
   * @returns {Promise<StatusPublicAPIRecord[]>}
   */
  async list (opts) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/statuses', 'read')
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
    if ('visibility' in opts) {
      assert(typeof opts.visibility === 'string', 'Visibility filter must be a string')
    }
    var statuses = await statusesAPI.list(opts)
    return Promise.all(statuses.map(massageStatusRecord))
  },

  /**
   * @param {string} url
   * @returns {Promise<StatusPublicAPIRecord>}
   */
  async get (url) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/statuses', 'read')
    return massageStatusRecord(await statusesAPI.get(url))
  },

  /**
   * @param {Object|string} status
   * @param {string} status.body
   * @param {string} [status.visibility]
   * @returns {Promise<StatusPublicAPIRecord>}
   */
  async add (status) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/statuses', 'write')
    var userArchive = await sessionPerms.getSessionUserArchive(this.sender)

    // string usage
    if (typeof status === 'string') {
      status = {body: status}
    }

    assert(status && typeof status === 'object', 'The `status` parameter must be a string or object')
    assert(status.body && typeof status.body === 'string', 'The `status.body` parameter must be a non-empty string')
    if ('visibility' in status) assert(typeof status.visibility === 'string', 'The `status.visibility` parameter must be "public" or "private"')

    // default values
    if (!status.visibility) {
      status.visibility = 'public'
    }

    var url = await statusesAPI.add(userArchive, status)
    return massageStatusRecord(await statusesAPI.get(url))
  },

  /**
   * @param {string} url
   * @param {Object|string} status
   * @param {string} status.body
   * @param {string} [status.visibility]
   * @returns {Promise<StatusPublicAPIRecord>}
   */
  async edit (url, status) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/statuses', 'write')
    var userArchive = await sessionPerms.getSessionUserArchive(this.sender)

    // string usage
    if (typeof status === 'string') {
      status = {body: status}
    }

    assert(url && typeof url === 'string', 'The `url` parameter must be a valid URL')
    assert(status && typeof status === 'object', 'The `status` parameter must be a string or object')
    if ('body' in status) assert(typeof status.body === 'string', 'The `status.body` parameter must be a non-empty string')
    if ('visibility' in status) assert(typeof status.visibility === 'string', 'The `status.visibility` parameter must be "public" or "private"')

    var filepath = await urlToFilepath(url, userArchive.url)
    await statusesAPI.edit(userArchive, filepath, status)
    return massageStatusRecord(await statusesAPI.get(userArchive.url + filepath))
  },

  /**
   * @param {string} url
   * @returns {Promise<void>}
   */
  async remove (url) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/statuses', 'write')
    var userArchive = await sessionPerms.getSessionUserArchive(this.sender)

    assert(url && typeof url === 'string', 'The `url` parameter must be a valid URL')

    var filepath = await urlToFilepath(url, userArchive.url)
    await statusesAPI.remove(userArchive, filepath)
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
    throw new Error('Unable to edit statuses on other sites than your own')
  }

  return filepath
}

/**
 * @param {Object} status
 * @returns {StatusPublicAPIRecord}
 */
function massageStatusRecord (status) {
  if (!status) return null
  var url =  status.author.url + status.pathname
  return {
    url,
    body: status.body,
    createdAt: status.createdAt,
    updatedAt: status.updatedAt,
    author: {
      url: status.author.url,
      title: status.author.title,
      description: status.author.description,
      type: status.author.type
    },
    visibility: status.visibility
  }
}
