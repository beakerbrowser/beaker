import assert from 'assert'
import _difference from 'lodash.difference'
import Events from 'events'
import { URL } from 'url'
import Ajv from 'ajv'
import * as logLib from '../logger'
const logger = logLib.child({category: 'uwg', dataset: 'follows'})
import lock from '../../lib/lock'
import knex from '../lib/knex'
import * as db from '../dbs/profile-data-db'
import * as uwg from './index'
import * as datArchives from '../dat/archives'
import * as archivesDb from '../dbs/archives'
import { doCrawl, doCheckpoint, emitProgressEvent, ensureDirectory } from './util'
import followsSchema from './json-schemas/follows'
import { PATHS } from '../../lib/const'

import { join as joinPath } from 'path'
import _differenceBy from 'lodash.differenceby'

// constants
// =

const TABLE_VERSION = 1
const JSON_TYPE = 'unwalled.garden/follows'
const JSON_PATH = '/.data/follows.json'

// typedefs
// =

/**
 * @typedef {import('../dat/daemon').DaemonDatArchive} DaemonDatArchive
 * @typedef {import('./util').CrawlSourceRecord} CrawlSourceRecord
 * @typedef {import('../dbs/archives').LibraryArchiveMeta} LibraryArchiveMeta
 *
 * @typedef {Object} Follow
 * @prop {LibraryArchiveMeta} author
 * @prop {LibraryArchiveMeta} topic
 * @prop {string} visibility
 */

// globals
// =

const events = new Events()
const ajv = (new Ajv())
const validateFollows = ajv.compile(followsSchema)

// exported api
// =

export const on = events.on.bind(events)

export const addListener = events.addListener.bind(events)
export const removeListener = events.removeListener.bind(events)

/**
 * @description
 * Crawl the given site for follows.
 *
 * @param {DaemonDatArchive} archive - site to crawl.
 * @param {CrawlSourceRecord} crawlSource - internal metadata about the crawl target.
 * @returns {Promise<void>}
 */
export async function crawlSite (archive, crawlSource) {
  return doCrawl(archive, crawlSource, 'crawl_follows', TABLE_VERSION, async ({changes, resetRequired}) => {
    const supressEvents = resetRequired === true // dont emit when replaying old info
    logger.silly('Crawling follows', {details: {url: archive.url, numChanges: changes.length, resetRequired}})
    if (resetRequired) {
      // reset all data
      logger.debug('Resetting dataset', {details: {url: archive.url}})
      await db.run(`
        DELETE FROM crawl_follows WHERE crawlSourceId = ?
      `, [crawlSource.id])
      await doCheckpoint('crawl_follows', TABLE_VERSION, crawlSource, 0)
    }

    // did follows.json change?
    var change = changes.find(c => c.name === JSON_PATH)
    if (!change) {
      logger.debug('No change detected to follows record', {details: {url: archive.url}})
      if (changes.length) {
        await doCheckpoint('crawl_follows', TABLE_VERSION, crawlSource, changes[changes.length - 1].version)
      }
      return
    }

    logger.verbose('Change detected to follows record', {details: {url: archive.url}})
    emitProgressEvent(archive.url, 'crawl_follows', 0, 1)

    // read and validate
    try {
      var followsJson = await readFollowsFile(archive)
    } catch (err) {
      logger.warn('Failed to read follows file', {details: {url: archive.url, err}})
      return
    }

    // diff against the current follows
    var currentFollowRows = await db.all(
      knex('crawl_follows')
        .select('crawl_follows.*')
        .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_follows.crawlSourceId')
        .where('crawl_sources.url', archive.url)
    )
    var currentFollows = currentFollowRows.map(({destUrl}) => destUrl)
    var newFollows = followsJson.urls
    var adds = _difference(newFollows, currentFollows)
    var removes = _difference(currentFollows, newFollows)
    logger.silly(`Adding ${adds.length} follows and removing ${removes.length} follows`, {details: {url: archive.url}})

    // write updates
    for (let add of adds) {
      try {
        await db.run(`
          INSERT INTO crawl_follows (crawlSourceId, destUrl, crawledAt) VALUES (?, ?, ?)
        `, [crawlSource.id, add, Date.now()])
      } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT') {
          // uniqueness constraint probably failed, which means we got a duplicate somehow
          // dont worry about it
          logger.warn('Attempted to insert duplicate follow record', {details: {url: archive.url, add}})
        } else {
          throw e
        }
      }
      if (!supressEvents) {
        events.emit('follow-added', archive.url, add)
      }
    }
    for (let remove of removes) {
      await db.run(`
        DELETE FROM crawl_follows WHERE crawlSourceId = ? AND destUrl = ?
      `, [crawlSource.id, remove])
      if (supressEvents) {
        events.emit('follow-removed', archive.url, remove)
      }
    }

    // write checkpoint as success
    logger.silly(`Finished crawling follows`, {details: {url: archive.url}})
    await doCheckpoint('crawl_follows', TABLE_VERSION, crawlSource, changes[changes.length - 1].version)
    emitProgressEvent(archive.url, 'crawl_follows', 1, 1)
  })
};

/**
 * @description
 * List crawled follows.
 *
 * @param {Object} [opts]
 * @param {string|string[]} [opts.author]
 * @param {string|string[]} [opts.topic]
 * @param {string} [opts.visibility]
 * @param {string} [opts.sortBy]
 * @param {number} [opts.offset=0]
 * @param {number} [opts.limit]
 * @param {boolean} [opts.reverse]
 * @returns {Promise<Array<Follow>>}
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
    opts.topic = await Promise.all(opts.topic.map(datArchives.getPrimaryUrl))
  }

  // execute query
  let sql = knex('crawl_follows')
    .select('crawl_follows.*')
    .select('crawl_sources.url AS authorUrl')
    .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_follows.crawlSourceId')
    .orderBy('crawl_follows.destUrl', opts.reverse ? 'DESC' : 'ASC')
  if (opts.limit) sql = sql.limit(opts.limit)
  if (opts.offset) sql = sql.offset(opts.offset)
  if (opts.author) {
    sql = sql.whereIn('crawl_sources.url', opts.author)
  }
  if (opts.topic) {
    sql = sql.whereIn('crawl_follows.destUrl', opts.topic)
  }
  var rows = await db.all(sql)

  // massage results
  return (await Promise.all(rows.map(async (row) => {
    var author = toOrigin(row.authorUrl)
    var topic = toOrigin(row.destUrl)
    return {
      author: await archivesDb.getMeta(author),
      topic: await archivesDb.getMeta(topic),
      visibility: 'public'
    }
  }))).filter(record => !!record.author && !!record.topic)
}

/**
 * @description
 * Get an individual follow.
 *
 * @param {string} author - (URL) the site being queried.
 * @param {string} topic - (URL) does a follow this site?
 * @returns {Promise<Follow>}
 */
export async function get (author, topic) {
  author = await datArchives.getPrimaryUrl(author)
  topic = await datArchives.getPrimaryUrl(topic)
  var res = await db.get(knex('crawl_follows')
    .select('crawl_follows.*')
    .select('crawl_sources.url AS authorUrl')
    .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_follows.crawlSourceId')
    .where('crawl_sources.url', author)
    .where('crawl_follows.destUrl', topic))
  if (!res) return null
  var record = {
    author: await archivesDb.getMeta(toOrigin(res.authorUrl)),
    topic: await archivesDb.getMeta(toOrigin(res.destUrl)),
    visibility: 'public'
  }
  if (!record.author || !record.topic) return null
  return record
}

/**
 * @description
 * Add a follow to the given archive.
 *
 * @param {DaemonDatArchive} archive
 * @param {string} topic
 * @param {Object} [opts]
 * @param {string} [opts.visibility]
 * @returns {Promise<void>}
 */
export async function add (archive, topic, opts) {
  // TODO visibility

  // normalize topic
  topic = await datArchives.getPrimaryUrl(topic)
  assert(typeof topic === 'string', 'Follow() must be given a valid URL')

  // persist
  var followUrls = await updateFollowsFile(archive, followsJson => {
    if (!followsJson.urls.find(v => v === topic)) {
      followsJson.urls.push(topic)
    }
  })
  await updateFollowsMounts(archive, followUrls)
};

/**
 * @description
 * Edit a follow for the given archive.
 *
 * @param {DaemonDatArchive} archive
 * @param {string} topic
 * @param {Object} [opts]
 * @param {string} [opts.visibility]
 * @returns {Promise<void>}
 */
export async function edit (archive, topic, opts) {
  // TODO visibility

  // normalize topic
  topic = await datArchives.getPrimaryUrl(topic)
  assert(typeof topic === 'string', 'Follow() must be given a valid URL')

  // persist
  var followUrls = await updateFollowsFile(archive, followsJson => {
    if (!followsJson.urls.find(v => v === topic)) {
      followsJson.urls.push(topic)
    }
  })
  await updateFollowsMounts(archive, followUrls)
};

/**
 * @description
 * Remove a follow from the given archive.
 *
 * @param {DaemonDatArchive} archive
 * @param {string} topic
 * @returns {Promise<void>}
 */
export async function remove (archive, topic) {
  // TODO private follows

  // normalize topic
  topic = await datArchives.getPrimaryUrl(topic)
  assert(typeof topic === 'string', 'Unfollow() must be given a valid URL')

  // persist
  var followUrls = await updateFollowsFile(archive, followsJson => {
    var i = followsJson.urls.findIndex(v => v === topic)
    if (i !== -1) {
      followsJson.urls.splice(i, 1)
    }
  })
  await updateFollowsMounts(archive, followUrls)
};

// internal methods
// =

/**
 * @param {string} url
 * @returns {string}
 */
function toOrigin (url) {
  try {
    var urlParsed = new URL(url)
    return urlParsed.protocol + '//' + urlParsed.hostname
  } catch (e) {
    return null
  }
}

/**
 * @param {DaemonDatArchive} archive
 * @returns {Promise<Object>}
 */
async function readFollowsFile (archive) {
  try {
    var followsJson = await archive.pda.readFile(JSON_PATH, 'utf8')
  } catch (e) {
    if (e.notFound) return {type: JSON_TYPE, urls: []} // empty default when not found
    throw e
  }
  followsJson = JSON.parse(followsJson)
  var valid = validateFollows(followsJson)
  if (!valid) throw ajv.errorsText(validateFollows.errors)
  return followsJson
}

/**
 * @param {DaemonDatArchive} archive
 * @param {function(Object): void} updateFn
 * @returns {Promise<string[]>}
 */
async function updateFollowsFile (archive, updateFn) {
  var origFollowsUrls
  var followUrls
  var release = await lock('crawler:follows:' + archive.url)
  try {
    // read the follows file
    try {
      var followsJson = await readFollowsFile(archive)
    } catch (err) {
      if (err.notFound) {
        // create new
        followsJson = {
          type: JSON_TYPE,
          urls: []
        }
      } else {
        logger.warn('Failed to read follows file', {details: {url: archive.url, err}})
        throw err
      }
    }

    // apply update
    origFollowsUrls = followsJson.urls
    updateFn(followsJson)
    followUrls = followsJson.urls

    // write the follows file
    await ensureDirectory(archive, '/.data')
    await archive.pda.writeFile(JSON_PATH, JSON.stringify(followsJson, null, 2), 'utf8')

    // trigger crawl now
    await uwg.crawlSite(archive)
  } catch (e) {
    followUrls = origFollowsUrls // fallback to original, update failed
    throw e
  } finally {
    release()
  }
  return followUrls
}

/**
 * @param {DaemonDatArchive} archive
 * @param {string[]} followUrls
 */
async function updateFollowsMounts (archive, followUrls) {
  /* DEBUG temporarily disabled
  // resolve all followUrls to keys
  var followKeys = []
  for (let url of followUrls) {
    try {
      followKeys.push(await datArchives.fromURLToKey(url, true))
    } catch (e) {
      // skip, which will cause it to unmount for now
    }
  }

  // get current list of followed URLs
  await ensureDirectory(archive, PATHS.REFS_FOLLOWED_DATS)
  var mountNames = await archive.pda.readdir(PATHS.REFS_FOLLOWED_DATS)
  var mounts = []
  for (let name of mountNames) {
    let st = await archive.pda.stat(joinPath(PATHS.REFS_FOLLOWED_DATS, name)).catch(err => null)
    if (st && st.mount) {
      mounts.push({name, key: st.mount.key.toString('hex')})
    }
  }

  // add/remove as needed
  var adds = _differenceBy(followKeys, mounts, v => v.key ? v.key : v)
  for (let add of adds) {
    await archive.pda.mount(joinPath(PATHS.REFS_FOLLOWED_DATS, add), add)
  }
  var removes = _differenceBy(mounts, followKeys, v => v.key ? v.key : v)
  for (let remove of removes) {
    await archive.pda.unmount(joinPath(PATHS.REFS_FOLLOWED_DATS, remove.name))
  }*/
}
