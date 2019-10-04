import assert from 'assert'
import * as tagsAPI from '../../uwg/tags'
import * as sessionPerms from '../../lib/session-perms'

// typedefs
// =

/**
 * @typedef {import('../../uwg/tags').Tag} Tag
 *
 * @typedef {Object} TagPublicAPIRecord
 * @prop {string} tag
 * @prop {number} count
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
   * @returns {Promise<TagPublicAPIRecord[]>}
   */
  async listBookmarkTags (opts) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/bookmarks', 'read')
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
    var tags = await tagsAPI.listBookmarkTags(opts)
    return tags.map(massageTagRecord)
  }
}

// internal methods
// =

/**
 * @param {Tag} tag
 * @returns {TagPublicAPIRecord}
 */
function massageTagRecord (tag) {
  if (!tag) return null
  return {
    tag: tag.tag,
    count: tag.count
  }
}