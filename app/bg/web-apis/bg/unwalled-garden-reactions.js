import assert from 'assert'
import { URL } from 'url'
import * as archivesDb from '../../dbs/archives'
import * as reactionsAPI from '../../uwg/reactions'
import * as sessionPerms from '../../lib/session-perms'

// typedefs
// =

/**
 * @typedef {import('../../uwg/reactions').Reaction} Reaction
 *
 * @typedef {Object} ReactionAuthorPublicAPIRecord
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 * @prop {string} type
 * @prop {boolean} isOwner
 *
 * @typedef {Object} TopicReactionsPublicAPIRecord
 * @prop {string} topic
 * @prop {string} phrase
 * @prop {ReactionAuthorPublicAPIRecord[]} authors
 *
 * @typedef {Object} ReactionPublicAPIRecord
 * @prop {string} url
 * @prop {string} topic
 * @prop {string[]} phrases
 * @prop {ReactionAuthorPublicAPIRecord} author
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
   * @returns {Promise<ReactionPublicAPIRecord[]>}
   */
  async list (opts) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/reactions', 'read')
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
    var reactions = await reactionsAPI.list(opts)
    return Promise.all(reactions.map(massageReactionRecord))
  },

  /**
   * @param {string} topic
   * @param {Object} [opts]
   * @param {string|string[]} [opts.author]
   * @param {string} [opts.visibility]
   * @returns {Promise<TopicReactionsPublicAPIRecord[]>}
   */
  async tabulate (topic, opts) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/reactions', 'read')
    topic = normalizeTopicUrl(topic)
    assert(topic && typeof topic === 'string', 'The `topic` parameter must be a valid URL')
    opts = (opts && typeof opts === 'object') ? opts : {}
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

    var reactions = await reactionsAPI.tabulate(topic, opts)
    return Promise.all(reactions.map(async (reaction) => ({
      topic,
      phrase: reaction.phrase,
      authors: await Promise.all(reaction.authors.map(async (url) => {
        var desc = await archivesDb.getMeta(url)
        return {
          url: desc.url,
          title: desc.title,
          description: desc.description,
          type: desc.type,
          isOwner: desc.isOwner
        }
      }))
    })))
  },

  /**
   * @param {string} topic
   * @param {string} phrase
   * @returns {Promise<void>}
   */
  async add (topic, phrase) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/reactions', 'write')
    var userArchive = await sessionPerms.getSessionUserArchive(this.sender)

    topic = normalizeTopicUrl(topic)
    assert(topic && typeof topic === 'string', 'The `topic` parameter must be a valid URL')
    assert(isValidPhrase(phrase), 'The `phrase` parameter must be a lowercase string that matches /^[a-z]+$/ and is less than 20 characters long.')

    await reactionsAPI.add(userArchive, topic, phrase)
  },

  /**
   * @param {string} topic
   * @param {string} phrase
   * @returns {Promise<void>}
   */
  async remove (topic, phrase) {
    await sessionPerms.assertCan(this.sender, 'unwalled.garden/api/reactions', 'write')
    var userArchive = await sessionPerms.getSessionUserArchive(this.sender)

    topic = normalizeTopicUrl(topic)
    assert(topic && typeof topic === 'string', 'The `topic` parameter must be a valid URL')
    assert(isValidPhrase(phrase), 'The `phrase` parameter must be a lowercase string that matches /^[a-z]+$/ and is less than 20 characters long.')

    await reactionsAPI.remove(userArchive, topic, phrase)
  }
}

// internal methods
// =

function isValidPhrase (v) {
  return v && typeof v === 'string' && v.length <= 20 && /^[a-z ]+$/.test(v)
}

function normalizeTopicUrl (url) {
  try {
    url = new URL(url)
    return (url.protocol + '//' + url.hostname + url.pathname + url.search + url.hash).replace(/([/]$)/g, '')
  } catch (e) {}
  return null
}

/**
 * @param {Reaction} reaction
 * @returns {Promise<ReactionPublicAPIRecord>}
 */
async function massageReactionRecord (reaction) {
  var desc = await archivesDb.getMeta(reaction.author)
  return {
    url: reaction.recordUrl,
    topic: reaction.topic,
    phrases: reaction.phrases,
    author: {
      url: desc.url,
      title: desc.title,
      description: desc.description,
      type: desc.type,
      isOwner: desc.isOwner
    },
    visibility: reaction.visibility
  }
}