import Events from 'events'
import Ajv from 'ajv'
import * as logLib from '../logger'
const logger = logLib.child({category: 'uwg', dataset: 'votes'})
import * as db from '../dbs/profile-data-db'
import * as uwg from './index'
import * as datArchives from '../dat/archives'
import * as archivesDb from '../dbs/archives'
import knex from '../lib/knex'
import { doCrawl, doCheckpoint, emitProgressEvent, getMatchingChangesInOrder, ensureDirectory, normalizeTopicUrl, generateTimeFilename } from './util'
import voteSchema from './json-schemas/vote'

// constants
// =

const TABLE_VERSION = 1
const JSON_TYPE = 'unwalled.garden/vote'
const JSON_PATH_REGEX = /^\/\.data\/votes\/([^/]+)\.json$/i

// typedefs
// =

/**
 * @typedef {import('../dat/daemon').DaemonDatArchive} DaemonDatArchive
 * @typedef {import('./util').CrawlSourceRecord} CrawlSourceRecord
 * @typedef { import("../dbs/archives").LibraryArchiveMeta } LibraryArchiveMeta
 *
 * @typedef {Object} Vote
 * @prop {string} pathname
 * @prop {string} topic
 * @prop {number} vote
 * @prop {string} createdAt
 * @prop {string} updatedAt
 * @prop {LibraryArchiveMeta} author
 * @prop {string} visibility
 *
 * @typedef {Object} TabulatedVotes
 * @prop {string} topic
 * @prop {number} upvotes
 * @prop {LibraryArchiveMeta[]} upvoters
 * @prop {number} downvotes
 * @prop {LibraryArchiveMeta[]} downvoters
 */

// globals
// =

const events = new Events()
const ajv = (new Ajv())
const validateVote = ajv.compile(voteSchema)

// exported api
// =

export const on = events.on.bind(events)

export const addListener = events.addListener.bind(events)
export const removeListener = events.removeListener.bind(events)

/**
 * @description
 * Crawl the given site for votes.
 *
 * @param {DaemonDatArchive} archive - site to crawl.
 * @param {CrawlSourceRecord} crawlSource - internal metadata about the crawl target.
 * @returns {Promise}
 */
export async function crawlSite (archive, crawlSource) {
  return doCrawl(archive, crawlSource, 'crawl_votes', TABLE_VERSION, async ({changes, resetRequired}) => {
    const supressEvents = resetRequired === true // dont emit when replaying old info
    logger.silly('Crawling votes', {details: {url: archive.url, numChanges: changes.length, resetRequired}})
    if (resetRequired) {
      // reset all data
      logger.debug('Resetting dataset', {details: {url: archive.url}})
      await db.run(`
        DELETE FROM crawl_votes WHERE crawlSourceId = ?
      `, [crawlSource.id])
      await doCheckpoint('crawl_votes', TABLE_VERSION, crawlSource, 0)
    }

    // collect changed votes
    var changedVotes = getMatchingChangesInOrder(changes, JSON_PATH_REGEX)
    if (changedVotes.length) {
      logger.verbose('Collected new/changed vote files', {details: {url: archive.url, changedVotes: changedVotes.map(p => p.name)}})
    } else {
      logger.debug('No new vote-files found', {details: {url: archive.url}})
    }
    emitProgressEvent(archive.url, 'crawl_votes', 0, changedVotes.length)

    // read and apply each vote in order
    var progress = 0
    for (let changedVote of changedVotes) {
      // TODO Currently the crawler will abort reading the feed if any vote fails to load
      //      this means that a single unreachable file can stop the forward progress of vote indexing
      //      to solve this, we need to find a way to tolerate unreachable vote-files without losing our ability to efficiently detect new votes
      //      -prf
      if (changedVote.type === 'del') {
        // delete
        await db.run(`
          DELETE FROM crawl_votes WHERE crawlSourceId = ? AND pathname = ?
        `, [crawlSource.id, changedVote.name])
        events.emit('vote-updated', archive.url)
      } else {
        // read
        let fileString
        try {
          fileString = await archive.pda.readFile(changedVote.name, 'utf8')
        } catch (err) {
          logger.warn('Failed to read vote file, aborting', {details: {url: archive.url, name: changedVote.name, err}})
          return // abort indexing
        }

        // parse and validate
        let vote
        try {
          vote = JSON.parse(fileString)
          let valid = validateVote(vote)
          if (!valid) throw ajv.errorsText(validateVote.errors)
        } catch (err) {
          logger.warn('Failed to parse vote file, skipping', {details: {url: archive.url, name: changedVote.name, err}})
          continue // skip
        }

        // massage record
        vote.topic = normalizeTopicUrl(vote.topic)
        vote.createdAt = Number(new Date(vote.createdAt))
        vote.updatedAt = Number(new Date(vote.updatedAt))
        if (isNaN(vote.updatedAt)) vote.updatedAt = 0 // optional

        // delete existing
        await db.run(knex('crawl_votes').where({crawlSourceId: crawlSource.id, topic: vote.topic}).del())

        // insert new
        await db.run(knex('crawl_votes').insert({
          crawlSourceId: crawlSource.id,
          pathname: changedVote.name,
          crawledAt: Date.now(),
          topic: vote.topic,
          vote: vote.vote,
          createdAt: vote.createdAt,
          updatedAt: vote.updatedAt
        }))
        events.emit('vote-updated', archive.url)
      }

      // checkpoint our progress
      logger.silly(`Finished crawling votes`, {details: {url: archive.url}})
      await doCheckpoint('crawl_votes', TABLE_VERSION, crawlSource, changedVote.version)
      emitProgressEvent(archive.url, 'crawl_votes', ++progress, changedVotes.length)
    }
  })
};

/**
 * @description
 * List crawled votes.
 *
 * @param {Object} [opts]
 * @param {string|string[]} [opts.author]
 * @param {string|string[]} [opts.topic]
 * @param {string} [opts.visibility]
 * @param {string} [opts.sortBy]
 * @param {number} [opts.offset=0]
 * @param {number} [opts.limit]
 * @param {boolean} [opts.reverse]
 * @returns {Promise<Array<Vote>>}
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
  let sql = knex('crawl_votes')
    .select('crawl_votes.*')
    .select('crawl_sources.url AS author')
    .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_votes.crawlSourceId')
    .orderBy('crawl_votes.topic', opts.reverse ? 'DESC' : 'ASC')
  if (opts.limit) sql = sql.limit(opts.limit)
  if (opts.offset) sql = sql.offset(opts.offset)
  if (opts.author) {
    sql = sql.whereIn('crawl_sources.url', opts.author)
  }
  if (opts.topic) {
    sql = sql.whereIn('crawl_votes.topic', opts.topic)
  }
  var rows = await db.all(sql)

  // massage results
  return Promise.all(rows.map(massageVoteRow))
};

/**
 * @description
 * List crawled votes on a topic.
 *
 * @param {string} topic - The URL of the topic
 * @param {Object} [opts]
 * @param {string|string[]} [opts.author]
 * @param {string} [opts.visibility]
 * @returns {Promise<TabulatedVotes>}
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
  var sql = knex('crawl_votes')
    .select('crawl_votes.*')
    .select('crawl_sources.url AS crawlSourceUrl')
    .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_votes.crawlSourceId')
    .where('crawl_votes.topic', topic)
  if (opts.author) {
    sql = sql.whereIn('crawl_sources.url', opts.author)
  }
  var rows = await db.all(sql)

  // construct votes tally
  var tally = {
    topic,
    upvotes: 0,
    upvoters: [],
    downvotes: 0,
    downvoters: []
  }
  await Promise.all(rows.map(async (row) => {
    let author = await archivesDb.getMeta(row.crawlSourceUrl)
    if ((+row.vote) === 1) {
      tally.upvotes++
      tally.upvoters.push(author)
    } else {
      tally.downvotes++
      tally.downvoters.push(author)
    }
  }))
  return tally
};

/**
 * @description
 * Get crawled vote.
 *
 * @param {string} author - The URL of the author
 * @param {string} topic - The URL of the topic
 * @returns {Promise<Vote>}
 */
export async function get (author, topic) {
  author = await datArchives.getPrimaryUrl(author)
  topic = normalizeTopicUrl(topic)

  // execute query
  var sql = knex('crawl_votes')
    .select('crawl_votes.*')
    .select('crawl_sources.url AS crawlSourceUrl')
    .innerJoin('crawl_sources', function () {
      this.on('crawl_sources.id', '=', 'crawl_votes.crawlSourceId')
        .andOn('crawl_sources.url', '=', knex.raw('?', author))
    })
    .where('crawl_votes.topic', topic)
  return await massageVoteRow(await db.get(sql))
}

/**
 * @description
 * Set a vote.
 *
 * @param {DaemonDatArchive} archive - where to write the vote to.
 * @param {string} topic
 * @param {number} vote
 * @returns {Promise<void>}
 */
export async function set (archive, topic, vote) {
  // TODO handle visibility

  // get the existing vote if it exists
  let existingVote = await get(archive.url, topic)
  var filename = existingVote ? existingVote.createdAt : generateTimeFilename()
  var filepath = `/.data/votes/${filename}.json`

  if (vote === 0) {
    // delete vote
    if (!existingVote) return
    await archive.pda.unlink(filepath)
  } else {
    // set new vote
    var voteObject = {
      type: JSON_TYPE,
      topic: normalizeTopicUrl(topic),
      vote,
      createdAt: existingVote ? existingVote.createdAt : (new Date()).toISOString()
    }
    if (existingVote) {
      voteObject.updatedAt = (new Date()).toISOString()
    }

    var valid = validateVote(voteObject)
    if (!valid) throw ajv.errorsText(validateVote.errors)

    await ensureDirectory(archive, '/.data/votes')
    await archive.pda.writeFile(filepath, JSON.stringify(voteObject, null, 2))
  }
  await uwg.crawlSite(archive)
};

// internal methods
// =

/**
 * @param {Object} row
 * @returns {Promise<Vote>}
 */
async function massageVoteRow (row) {
  if (!row) return null
  var author = await archivesDb.getMeta(row.crawlSourceUrl)
  return {
    pathname: row.pathname,
    author,
    topic: row.topic,
    vote: row.vote,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    visibility: 'public' // TODO visibility
  }
}