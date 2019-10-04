import * as windows from '../../ui/windows'
import * as search from '../../uwg/search'

// typedefs
// =

/**
 * @typedef {Object} SearchPublicAPIResult
 * @prop {number} highlightNonce - A number used to create perimeters around text that should be highlighted.
 * @prop {Array<SearchPublicAPISiteResult|SearchPublicAPIPostResult>} results
 *
 * @typedef {Object} SearchPublicAPIResultAuthor
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 * @prop {string} type
 *
 * @typedef {Object} SearchPublicAPIResultRecord
 * @prop {string} type
 * @prop {string} url
 * @prop {number} crawledAt
 * @prop {SearchPublicAPIResultAuthor} author
 *
 * @typedef {Object} SearchPublicAPISiteResult
 * @prop {SearchPublicAPIResultRecord} record
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 * @prop {string} type
 *
 * @typedef {Object} SearchPublicAPIPostResult
 * @prop {SearchPublicAPIResultRecord} record
 * @prop {string} url
 * @prop {Object} content
 * @prop {string} content.body
 * @prop {number} createdAt
 * @prop {number} updatedAt
 */

// exported api
// =

export default {
  /**
   * @param {Object} opts
   * @param {string} [opts.query] - The search query.
   * @param {string|string[]} [opts.datasets] - Filter results to the given datasets. Defaults to undefined. Valid values: undefined, 'dats', 'people', 'statuses', 'bookmarks'.
   * @param {number} [opts.since] - Filter results to items created since the given timestamp.
   * @param {number} [opts.hops=1] - How many hops out in the user's follow graph should be included? Valid values: 1, 2.
   * @param {number} [opts.offset]
   * @param {number} [opts.limit = 20]
   * @returns {Promise<SearchPublicAPIResult>}
   */
  async query (opts) {
    var sess = windows.getUserSessionFor(this.sender)
    if (!sess) return null
    return search.query(sess.url, opts)
  }
}
