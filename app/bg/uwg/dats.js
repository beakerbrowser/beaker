import _difference from 'lodash.difference'
import Events from 'events'
import { URL } from 'url'
import * as logLib from '../logger'
const logger = logLib.child({category: 'uwg', dataset: 'dats'})
import lock from '../../lib/lock'
import knex from '../lib/knex'
import * as db from '../dbs/profile-data-db'
import * as uwg from './index'
import * as datArchives from '../dat/archives'
import * as archivesDb from '../dbs/archives'
import { doCrawl, doCheckpoint, emitProgressEvent, ensureDirectory } from './util'
import * as schemas from '../../lib/schemas'

// constants
// =

const TABLE_VERSION = 1
const JSON_TYPE = 'unwalled.garden/dats'
const JSON_PATH = '/.data/dats.json'

// typedefs
// =

/**
 * @typedef {import('../dat/daemon').DaemonDatArchive} DaemonDatArchive
 * @typedef {import('./util').CrawlSourceRecord} CrawlSourceRecord
 * @typedef {import('../dbs/archives').LibraryArchiveMeta} LibraryArchiveMeta
 *
 * @typedef {Object} PublishedLibraryDat
 * @prop {string} key
 * @prop {LibraryArchiveMeta} author
 * @prop {LibraryArchiveMeta} meta
 * @prop {string} visibility
 */

// globals
// =

const events = new Events()
const validateDats = schemas.getValidator('unwalled.garden/dats.json')

// exported api
// =

export const on = events.on.bind(events)

export const addListener = events.addListener.bind(events)
export const removeListener = events.removeListener.bind(events)

/**
 * @description
 * Crawl the given site for dats.
 *
 * @param {DaemonDatArchive} archive - site to crawl.
 * @param {CrawlSourceRecord} crawlSource - internal metadata about the crawl target.
 * @returns {Promise<void>}
 */
export async function crawlSite (archive, crawlSource) {
  return doCrawl(archive, crawlSource, 'crawl_dats', TABLE_VERSION, async ({changes, resetRequired}) => {
    const supressEvents = resetRequired === true // dont emit when replaying old info
    logger.silly('Crawling dats', {details: {url: archive.url, numChanges: changes.length, resetRequired}})
    if (resetRequired) {
      // reset all data
      logger.debug('Resetting dataset', {details: {url: archive.url}})
      await db.run(`
        DELETE FROM crawl_dats WHERE crawlSourceId = ?
      `, [crawlSource.id])
      await doCheckpoint('crawl_dats', TABLE_VERSION, crawlSource, 0)
    }

    // did dats.json change?
    var change = changes.find(c => c.name === JSON_PATH)
    if (!change) {
      logger.debug('No change detected to dats record', {details: {url: archive.url}})
      if (changes.length) {
        await doCheckpoint('crawl_dats', TABLE_VERSION, crawlSource, changes[changes.length - 1].version)
      }
      return
    }

    logger.verbose('Change detected to dats record', {details: {url: archive.url}})
    emitProgressEvent(archive.url, 'crawl_dats', 0, 1)

    // read and validate
    try {
      var datsJson = await readDatsFile(archive)
    } catch (err) {
      logger.warn('Failed to read dats file', {details: {url: archive.url, err}})
      return
    }

    // upsert
    // TODO this could be much more efficient than delete/insert
    await db.run(`DELETE FROM crawl_dats WHERE crawlSourceId = ?`, [crawlSource.id])
    for (let dat of datsJson.dats) {
      let type = dat.type || ''
      await db.run(`
        INSERT INTO crawl_dats (crawlSourceId, crawledAt, key, title, description, type)
          VALUES (?, ?, ?, ?, ?, ?)
      `, [crawlSource.id, Date.now(), dat.key, dat.title || '', dat.description || '', type])
    }

    // write checkpoint as success
    logger.silly(`Finished crawling dats`, {details: {url: archive.url}})
    await doCheckpoint('crawl_dats', TABLE_VERSION, crawlSource, changes[changes.length - 1].version)
    emitProgressEvent(archive.url, 'crawl_dats', 1, 1)
  })
};

/**
 * @description
 * List crawled dats.
 *
 * @param {Object} [opts]
 * @param {string|string[]} [opts.author]
 * @param {string|string[]} [opts.type]
 * @param {string|string[]} [opts.key]
 * @param {string} [opts.sortBy]
 * @param {number} [opts.offset=0]
 * @param {number} [opts.limit]
 * @param {boolean} [opts.reverse]
 * @returns {Promise<Array<PublishedLibraryDat>>}
 */
export async function list (opts) {
  // TODO: sortBy options

  // massage params
  if (typeof opts.author !== 'undefined') {
    if (!Array.isArray(opts.author)) {
      opts.author = [opts.author]
    }
    opts.author = await Promise.all(opts.author.map(datArchives.getPrimaryUrl))
  }
  if (typeof opts.key !== 'undefined') {
    if (!Array.isArray(opts.key)) {
      opts.key = [opts.key]
    }
  }
  if (typeof opts.type !== 'undefined') {
    if (!Array.isArray(opts.type)) {
      opts.type = [opts.type]
    }
  }

  // execute query
  let sql = knex('crawl_dats')
    .select('crawl_dats.*')
    .select('crawl_sources.url AS authorUrl')
    .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_dats.crawlSourceId')
    .orderBy('crawl_dats.key', opts.reverse ? 'DESC' : 'ASC')
  if (opts.limit) sql = sql.limit(opts.limit)
  if (opts.offset) sql = sql.offset(opts.offset)
  if (opts.author) {
    sql = sql.whereIn('crawl_sources.url', opts.author)
  }
  if (opts.key) {
    sql = sql.whereIn('crawl_dats.key', opts.key)
  }
  if (opts.type) {
    sql = sql.whereIn('crawl_dats.type', opts.type)
  }
  var rows = await db.all(sql)

  // massage results
  return (await Promise.all(rows.map(async (row) => {
    return {
      key: row.key,
      author: await archivesDb.getMeta(toOrigin(row.authorUrl)),
      meta: Object.assign(
        await archivesDb.getMeta(row.key),
        {
          title: row.title,
          description: row.description,
          type: row.type
        }
      ),
      visibility: 'public'
    }
  })))
};

/**
 * @description
 * Add a dat to the public dats file.
 *
 * @param {DaemonDatArchive} archive
 * @param {string} key
 * @param {Object} meta
 * @param {string} meta.title
 * @param {string} meta.description
 * @param {string} meta.type
 * @returns {Promise<void>}
 */
export async function publish (archive, key, meta) {
  // persist
  await updateDatsFile(archive, datsJson => {
    var dat = datsJson.dats.find(v => v.key === key)
    if (!dat) {
      datsJson.dats.push({
        key,
        title: meta.title,
        description: meta.description,
        type: meta.type
      })
    } else {
      Object.assign(dat, {
        title: meta.title,
        description: meta.description,
        type: meta.type
      })
    }
    return true
  })
};

/**
 * @description
 * Remove a dat from the public dats file.
 *
 * @param {DaemonDatArchive} archive
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function unpublish (archive, key) {
  // persist
  await updateDatsFile(archive, datsJson => {
    var i = datsJson.dats.findIndex(v => v.key === key)
    if (i !== -1) {
      datsJson.dats.splice(i, 1)
      return true
    }
    return false
  })
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
async function readDatsFile (archive) {
  try {
    var datsJson = await archive.pda.readFile(JSON_PATH, 'utf8')
  } catch (e) {
    if (e.notFound) return {type: JSON_TYPE, dats: []} // empty default when not found
    throw e
  }
  datsJson = JSON.parse(datsJson)
  var valid = validateDats(datsJson)
  if (!valid) throw ajv.errorsText(validateDats.errors)
  return datsJson
}

/**
 * @param {DaemonDatArchive} archive
 * @param {function(Object): boolean} updateFn
 * @returns {Promise<void>}
 */
async function updateDatsFile (archive, updateFn) {
  var release = await lock('crawler:dats:' + archive.url)
  try {
    // read the dats file
    try {
      var datsJson = await readDatsFile(archive)
    } catch (err) {
      if (err.notFound) {
        // create new
        datsJson = {
          type: JSON_TYPE,
          dats: []
        }
      } else {
        logger.warn('Failed to read dats file', {details: {url: archive.url, err}})
        throw err
      }
    }

    // apply update
    if (!updateFn(datsJson)) {
      return // no changes
    }

    // write the dats file
    await ensureDirectory(archive, '/.data')
    await archive.pda.writeFile(JSON_PATH, JSON.stringify(datsJson, null, 2), 'utf8')

    // trigger crawl now
    await uwg.crawlSite(archive)
  } finally {
    release()
  }
}
