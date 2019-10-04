import Events from 'events'
import Ajv from 'ajv'
import * as logLib from '../logger'
const logger = logLib.child({category: 'uwg', dataset: 'reactions'})
import * as db from '../dbs/profile-data-db'
import * as uwg from './index'
import * as datArchives from '../dat/archives'
import lock from '../../lib/lock'
import knex from '../lib/knex'
import { doCrawl, doCheckpoint, emitProgressEvent, getMatchingChangesInOrder, ensureDirectory, normalizeTopicUrl, slugifyUrl } from './util'
import reactionSchema from './json-schemas/reaction'

// constants
// =

const TABLE_VERSION = 1
const JSON_TYPE = 'unwalled.garden/reaction'
const JSON_PATH_REGEX = /^\/\.data\/reactions\/([^/]+)\.json$/i

// typedefs
// =

/**
 * @typedef {import('../dat/daemon').DaemonDatArchive} DaemonDatArchive
 * @typedef {import('./util').CrawlSourceRecord} CrawlSourceRecord
 *
 * @typedef {Object} Reaction
 * @prop {string} topic
 * @prop {string[]} phrases
 * @prop {string} author
 * @prop {string} recordUrl
 * @prop {number} crawledAt
 *
 * @typedef {Object} TopicReaction
 * @prop {string} phrase
 * @prop {string[]} authors
 */

// globals
// =

const events = new Events()
const ajv = (new Ajv())
const validateReaction = ajv.compile(reactionSchema)

// exported api
// =

export const on = events.on.bind(events)

export const addListener = events.addListener.bind(events)
export const removeListener = events.removeListener.bind(events)

/**
 * @description
 * Crawl the given site for reactions.
 *
 * @param {DaemonDatArchive} archive - site to crawl.
 * @param {CrawlSourceRecord} crawlSource - internal metadata about the crawl target.
 * @returns {Promise}
 */
export async function crawlSite (archive, crawlSource) {
  return doCrawl(archive, crawlSource, 'crawl_reactions', TABLE_VERSION, async ({changes, resetRequired}) => {
    const supressEvents = resetRequired === true // dont emit when replaying old info
    logger.silly('Crawling reactions', {details: {url: archive.url, numChanges: changes.length, resetRequired}})
    if (resetRequired) {
      // reset all data
      logger.debug('Resetting dataset', {details: {url: archive.url}})
      await db.run(`
        DELETE FROM crawl_reactions WHERE crawlSourceId = ?
      `, [crawlSource.id])
      await doCheckpoint('crawl_reactions', TABLE_VERSION, crawlSource, 0)
    }

    // collect changed reactions
    var changedReactions = getMatchingChangesInOrder(changes, JSON_PATH_REGEX)
    if (changedReactions.length) {
      logger.verbose('Collected new/changed reaction files', {details: {url: archive.url, changedReactions: changedReactions.map(p => p.name)}})
    } else {
      logger.debug('No new reaction-files found', {details: {url: archive.url}})
    }
    emitProgressEvent(archive.url, 'crawl_reactions', 0, changedReactions.length)

    // read and apply each reaction in order
    var progress = 0
    for (let changedReaction of changedReactions) {
      // TODO Currently the crawler will abort reading the feed if any reaction fails to load
      //      this means that a single unreachable file can stop the forward progress of reaction indexing
      //      to solve this, we need to find a way to tolerate unreachable reaction-files without losing our ability to efficiently detect new reactions
      //      -prf
      if (changedReaction.type === 'del') {
        // delete
        await db.run(`
          DELETE FROM crawl_reactions WHERE crawlSourceId = ? AND pathname = ?
        `, [crawlSource.id, changedReaction.name])
        events.emit('reaction-updated', archive.url)
      } else {
        // read
        let fileString
        try {
          fileString = await archive.pda.readFile(changedReaction.name, 'utf8')
        } catch (err) {
          logger.warn('Failed to read reaction file, aborting', {details: {url: archive.url, name: changedReaction.name, err}})
          return // abort indexing
        }

        // parse and validate
        let reaction
        try {
          reaction = JSON.parse(fileString)
          let valid = validateReaction(reaction)
          if (!valid) throw ajv.errorsText(validateReaction.errors)
        } catch (err) {
          logger.warn('Failed to parse reaction file, skipping', {details: {url: archive.url, name: changedReaction.name, err}})
          continue // skip
        }

        // massage record
        reaction.topic = normalizeTopicUrl(reaction.topic)

        // upsert
        await db.run(`
          INSERT OR REPLACE INTO crawl_reactions (crawlSourceId, pathname, crawledAt, topic, phrases)
            VALUES (?, ?, ?, ?, ?)
        `, [crawlSource.id, changedReaction.name, Date.now(), reaction.topic, reaction.phrases.join(',')])
        events.emit('reaction-updated', archive.url)
      }

      // checkpoint our progress
      logger.silly(`Finished crawling reactions`, {details: {url: archive.url}})
      await doCheckpoint('crawl_reactions', TABLE_VERSION, crawlSource, changedReaction.version)
      emitProgressEvent(archive.url, 'crawl_reactions', ++progress, changedReactions.length)
    }
  })
};

/**
 * @description
 * List crawled reactions.
 *
 * @param {Object} [opts]
 * @param {string|string[]} [opts.author]
 * @param {string|string[]} [opts.topic]
 * @param {string} [opts.visibility]
 * @param {string} [opts.sortBy]
 * @param {number} [opts.offset=0]
 * @param {number} [opts.limit]
 * @param {boolean} [opts.reverse]
 * @returns {Promise<Array<Reaction>>}
 */
export async function list (opts) {
  // TODO: handle visibility
  // TODO: sortBy options

  // massage params
  if ('author' in opts) {
    if (!Array.isArray(opts.author)) {
      opts.author = [opts.author]
    }
    opts.author = await Promise.all(opts.author.map(datArchives.getPrimaryUrl))
  }
  if ('topic' in opts) {
    if (!Array.isArray(opts.topic)) {
      opts.topic = [opts.topic]
    }
    opts.topic = opts.topic.map(normalizeTopicUrl)
  }

  // execute query
  let sql = knex('crawl_reactions')
    .select('crawl_reactions.*')
    .select('crawl_sources.url AS author')
    .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_reactions.crawlSourceId')
    .orderBy('crawl_reactions.topic', opts.reverse ? 'DESC' : 'ASC')
  if (opts.limit) sql = sql.limit(opts.limit)
  if (opts.offset) sql = sql.offset(opts.offset)
  if (opts.author) {
    sql = sql.whereIn('crawl_sources.url', opts.author)
  }
  if (opts.topic) {
    sql = sql.whereIn('crawl_reactions.topic', opts.topic)
  }
  var rows = await db.all(sql)

  // massage results
  rows.forEach(row => {
    row.phrases = row.phrases.split(',')
    row.recordUrl = row.author + row.pathname
  })
  return rows
};

/**
 * @description
 * List crawled reactions on a topic.
 *
 * @param {string} topic - The URL of the topic
 * @param {Object} [opts]
 * @param {string|string[]} [opts.author]
 * @param {string} [opts.visibility]
 * @returns {Promise<TopicReaction[]>}
 */
export async function tabulate (topic, opts) {
  // TODO handle visibility

  // massage params
  topic = normalizeTopicUrl(topic)
  if ('author' in opts) {
    if (!Array.isArray(opts.author)) {
      opts.author = [opts.author]
    }
    opts.author = await Promise.all(opts.author.map(datArchives.getPrimaryUrl))
  }

  // execute query
  var sql = knex('crawl_reactions')
    .select('crawl_reactions.*')
    .select('crawl_sources.url AS crawlSourceUrl')
    .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_reactions.crawlSourceId')
    .where('crawl_reactions.topic', topic)
  if (opts.author) {
    sql = sql.whereIn('crawl_sources.url', opts.author)
  }
  var rows = await db.all(sql)

  // construct reactions list
  var reactions = {}
  rows.forEach(row => {
    row.phrases.split(',').forEach(phrase => {
      if (!reactions[phrase]) {
        reactions[phrase] = {phrase, authors: [row.crawlSourceUrl]}
      } else {
        reactions[phrase].authors.push(row.crawlSourceUrl)
      }
    })
  })

  return Object.values(reactions)
};

/**
 * @description
 * Create a new reaction.
 *
 * @param {DaemonDatArchive} archive - where to write the reaction to.
 * @param {string} topic
 * @param {string} phrase
 * @returns {Promise<void>}
 */
export async function add (archive, topic, phrase) {
  // TODO handle visibility

  topic = normalizeTopicUrl(topic)
  phrase = phrase.toLowerCase()
  var valid = validateReaction({type: JSON_TYPE, topic, phrases: [phrase]})
  if (!valid) throw ajv.errorsText(validateReaction.errors)

  var filepath = `/.data/reactions/${slugifyUrl(topic)}.json`
  await ensureDirectory(archive, '/.data/reactions')
  await updateReactionFile(archive, filepath, topic, phrase, false)
  await uwg.crawlSite(archive)
};

/**
 * @description
 * Delete an existing reaction
 *
 * @param {DaemonDatArchive} archive - where to write the reaction to.
 * @param {string} topic
 * @param {string} phrase
 * @returns {Promise<void>}
 */
export async function remove (archive, topic, phrase) {
  // TODO handle visibility

  topic = normalizeTopicUrl(topic)
  phrase = phrase.toLowerCase()
  var valid = validateReaction({type: JSON_TYPE, topic, phrases: [phrase]})
  if (!valid) throw ajv.errorsText(validateReaction.errors)

  var filepath = `/.data/reactions/${slugifyUrl(topic)}.json`
  await updateReactionFile(archive, filepath, topic, false, phrase)
  await uwg.crawlSite(archive)
};

// internal methods
// =

/**
 * @param {DaemonDatArchive} archive
 * @param {string} pathname
 * @returns {Promise<Object>}
 */
async function readReactionFile (archive, pathname) {
  try {
    var json = await archive.pda.readFile(pathname, 'utf8')
    json = JSON.parse(json)
    var valid = validateReaction(json)
    if (!valid) throw ajv.errorsText(validateReaction.errors)
    return json
  } catch (e) {
    // fallback to an empty on error
    return {
      type: JSON_TYPE,
      topic: '',
      phrases: []
    }
  }
}

/**
 * @param {DaemonDatArchive} archive
 * @param {string} pathname
 * @param {string} topic
 * @param {string|boolean} addPhrase
 * @param {string|boolean} removePhrase
 * @returns {Promise<void>}
 */
async function updateReactionFile (archive, pathname, topic, addPhrase = false, removePhrase = false) {
  var release = await lock('crawler:reactions:' + archive.url)
  try {
    // read the reaction file
    var reactionJson = await readReactionFile(archive, pathname)

    // apply update
    reactionJson.topic = topic
    if (addPhrase) reactionJson.phrases = Array.from(new Set(reactionJson.phrases.concat([addPhrase])))
    if (removePhrase) reactionJson.phrases = reactionJson.phrases.filter(v => v !== removePhrase)

    // write or delete the reaction file
    if (reactionJson.phrases.length) {
      await archive.pda.writeFile(pathname, JSON.stringify(reactionJson, null, 2), 'utf8')
    } else {
      await archive.pda.unlink(pathname)
    }
  } finally {
    release()
  }
}
