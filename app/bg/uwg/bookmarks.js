import assert from 'assert'
import { URL } from 'url'
import Events from 'events'
import Ajv from 'ajv'
import * as logLib from '../logger'
const logger = logLib.child({category: 'uwg', dataset: 'bookmarks'})
import * as db from '../dbs/profile-data-db'
import * as datArchives from '../dat/archives'
import * as archivesDb from '../dbs/archives'
import knex from '../lib/knex'
import * as uwg from './index'
import * as filesystem from '../filesystem/index'
import { doCrawl, doCheckpoint, emitProgressEvent, getMatchingChangesInOrder, slugifyUrl, normalizeTopicUrl, ensureDirectory } from './util'
import bookmarkSchema from './json-schemas/bookmark'

// constants
// =

const TABLE_VERSION = 3
const JSON_TYPE = 'unwalled.garden/bookmark'
const JSON_PATH_REGEX = /^\/\.data\/bookmarks\/([^/]+)\.json$/i

// typedefs
// =

/**
 * @typedef {import('../dat/daemon').DaemonDatArchive} DaemonDatArchive
 * @typedef {import('./util').CrawlSourceRecord} CrawlSourceRecord
 * @typedef { import("../dbs/archives").LibraryArchiveMeta } LibraryArchiveMeta
 *
 * @typedef {Object} Bookmark
 * @prop {string} pathname
 * @prop {string} href
 * @prop {string} title
 * @prop {string?} description
 * @prop {string[]?} tags
 * @prop {string} visibility
 * @prop {number} crawledAt
 * @prop {number} createdAt
 * @prop {number} updatedAt
 * @prop {LibraryArchiveMeta} author
 */

// globals
// =

const events = new Events()
const ajv = (new Ajv())
const validateBookmark = ajv.compile(bookmarkSchema)

// exported api
// =

export const on = events.on.bind(events)

export const addListener = events.addListener.bind(events)
export const removeListener = events.removeListener.bind(events)

/**
 * @description
 * Crawl the given site for bookmarks.
 *
 * @param {DaemonDatArchive} archive - site to crawl.
 * @param {CrawlSourceRecord} crawlSource - internal metadata about the crawl target.
 * @returns {Promise}
 */
export async function crawlSite (archive, crawlSource) {
  return doCrawl(archive, crawlSource, 'crawl_bookmarks', TABLE_VERSION, async ({changes, resetRequired}) => {
    const supressEvents = resetRequired === true // dont emit when replaying old info
    logger.silly('Crawling bookmarks', {details: {url: archive.url, numChanges: changes.length, resetRequired}})
    if (resetRequired) {
      // reset all data
      logger.debug('Resetting dataset', {details: {url: archive.url}})
      await db.run(`
        DELETE FROM crawl_bookmarks WHERE crawlSourceId = ?
      `, [crawlSource.id])
      await doCheckpoint('crawl_bookmarks', TABLE_VERSION, crawlSource, 0)
    }

    // collect changed bookmarks
    var changedBookmarks = getMatchingChangesInOrder(changes, JSON_PATH_REGEX)
    if (changedBookmarks.length) {
      logger.verbose('Collected new/changed bookmark files', {details: {url: archive.url, changedBookmarks: changedBookmarks.map(p => p.name)}})
    } else {
      logger.debug('No new bookmark-files found', {details: {url: archive.url}})
    }
    emitProgressEvent(archive.url, 'crawl_bookmarks', 0, changedBookmarks.length)

    // read and apply each bookmark in order
    var progress = 0
    for (let changedBookmark of changedBookmarks) {
      // TODO Currently the crawler will abort reading the bookmarks if any bookmark fails to load
      //      this means that a single unreachable file can stop the forward progress of bookmark indexing
      //      to solve this, we need to find a way to tolerate unreachable bookmark-files without losing our ability to efficiently detect new bookmarks
      //      -prf
      if (changedBookmark.type === 'del') {
        // delete
        await db.run(`
          DELETE FROM crawl_bookmarks WHERE crawlSourceId = ? AND pathname = ?
        `, [crawlSource.id, changedBookmark.name])
        events.emit('bookmark-removed', archive.url)
      } else {
        // read
        let bookmarkString
        try {
          bookmarkString = await archive.pda.readFile(changedBookmark.name, 'utf8')
        } catch (err) {
          logger.warn('Failed to read bookmark file, aborting', {details: {url: archive.url, name: changedBookmark.name, err}})
          return // abort indexing
        }

        // parse and validate
        let bookmark
        try {
          bookmark = JSON.parse(bookmarkString)
          let valid = validateBookmark(bookmark)
          if (!valid) throw ajv.errorsText(validateBookmark.errors)
        } catch (err) {
          logger.warn('Failed to parse bookmark file, skipping', {details: {url: archive.url, name: changedBookmark.name, err}})
          continue // skip
        }

        // massage the bookmark
        bookmark.href = normalizeTopicUrl(bookmark.href)
        bookmark.createdAt = Number(new Date(bookmark.createdAt))
        bookmark.updatedAt = Number(new Date(bookmark.updatedAt))
        if (isNaN(bookmark.updatedAt)) bookmark.updatedAt = 0 // optional
        if (!bookmark.description) bookmark.description = '' // optional
        if (!bookmark.tags) bookmark.tags = [] // optional

        // upsert
        let existingBookmark = await getBookmark(joinPath(archive.url, changedBookmark.name))
        if (existingBookmark) {
          await db.run(`DELETE FROM crawl_bookmarks WHERE crawlSourceId = ? and pathname = ?`, [crawlSource.id, changedBookmark.name])
        }
        let res = await db.run(`
          INSERT INTO crawl_bookmarks (crawlSourceId, pathname, crawledAt, href, title, description, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [crawlSource.id, changedBookmark.name, Date.now(), bookmark.href, bookmark.title, bookmark.description, bookmark.createdAt, bookmark.updatedAt])
        var bookmarkId = res.lastID
        for (let tag of bookmark.tags) {
          await db.run(`INSERT OR IGNORE INTO crawl_tags (tag) VALUES (?)`, [tag])
          let tagRow = await db.get(`SELECT id FROM crawl_tags WHERE tag = ?`, [tag])
          await db.run(`INSERT INTO crawl_bookmarks_tags (crawlBookmarkId, crawlTagId) VALUES (?, ?)`, [bookmarkId, tagRow.id])
        }
        events.emit('bookmark-added', archive.url)
      }

      // checkpoint our progress
      logger.silly(`Finished crawling bookmarks`, {details: {url: archive.url}})
      await doCheckpoint('crawl_bookmarks', TABLE_VERSION, crawlSource, changedBookmark.version)
      emitProgressEvent(archive.url, 'crawl_bookmarks', ++progress, changedBookmarks.length)
    }
  })
};

/**
 * @description
 * List crawled bookmarks.
 *
  * @param {Object} [opts]
  * @param {string|string[]} [opts.author]
  * @param {string|string[]} [opts.tag]
  * @param {string} [opts.visibility]
  * @param {string} [opts.sortBy]
  * @param {number} [opts.offset=0]
  * @param {number} [opts.limit]
  * @param {boolean} [opts.reverse]
 * @returns {Promise<Array<Bookmark>>}
 */
export async function list (opts) {
  // massage params
  if ('author' in opts) {
    if (!Array.isArray(opts.author)) {
      opts.author = [opts.author]
    }
    opts.author = await Promise.all(opts.author.map(datArchives.getPrimaryUrl))
  }
  if ('tag' in opts) {
    if (!Array.isArray(opts.tag)) {
      opts.tag = [opts.tag]
    }
  }

  // build query
  var sql = knex('crawl_bookmarks')
    .select('crawl_bookmarks.*')
    .select('crawl_sources.url as crawlSourceUrl')
    .select('crawl_sources.isPrivate as isPrivate')
    .select(knex.raw('group_concat(crawl_tags.tag, ",") as tags'))
    .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_bookmarks.crawlSourceId')
    .leftJoin('crawl_bookmarks_tags', 'crawl_bookmarks_tags.crawlBookmarkId', '=', 'crawl_bookmarks.id')
    .leftJoin('crawl_tags', 'crawl_bookmarks_tags.crawlTagId', '=', 'crawl_tags.id')
    .groupBy('crawl_bookmarks.id')
  if (opts && opts.author) {
    sql = sql.whereIn('crawl_sources.url', opts.author)
  }
  if (opts && opts.visibility) {
    sql.where('crawl_sources.isPrivate', (opts.visibility === 'private') ? 1 : 0)
  }
  if (opts && opts.limit) sql = sql.limit(opts.limit)
  if (opts && opts.offset) sql = sql.offset(opts.offset)
  if (opts.sortBy === 'title') sql = sql.orderBy(knex.raw('LOWER(crawl_bookmarks.title)'), opts.reverse ? 'DESC' : 'ASC')
  else sql = sql.orderBy('crawl_bookmarks.createdAt', opts.reverse ? 'DESC' : 'ASC')

  // execute query
  var rows = await db.all(sql)
  var bookmarks = await Promise.all(rows.map(massageBookmarkRow))

  // apply tags filter
  if (opts && opts.tag) {
    const someFn = t => opts.tag.includes(t)
    bookmarks = bookmarks.filter(bookmark => bookmark.tags.some(someFn))
  }

  return bookmarks
};

/**
 * @description
 * Get crawled bookmark.
 *
 * @param {string} url - The URL of the bookmark
 * @returns {Promise<Bookmark>}
 */
export async function getBookmark (url) {
  // validate & parse params
  var urlParsed
  if (url) {
    try { urlParsed = new URL(url) }
    catch (e) { throw new Error('Invalid URL: ' + url) }
  }

  // build query
  var sql = knex('crawl_bookmarks')
    .select('crawl_bookmarks.*')
    .select('crawl_sources.url as crawlSourceUrl')
    .select('crawl_sources.isPrivate as isPrivate')
    .select(knex.raw('group_concat(crawl_tags.tag, ",") as tags'))
    .innerJoin('crawl_sources', function () {
      this.on('crawl_sources.id', '=', 'crawl_bookmarks.crawlSourceId')
        .andOn('crawl_sources.url', '=', knex.raw('?', `${urlParsed.protocol}//${urlParsed.hostname}`))
    })
    .leftJoin('crawl_bookmarks_tags', 'crawl_bookmarks_tags.crawlBookmarkId', '=', 'crawl_bookmarks.id')
    .leftJoin('crawl_tags', 'crawl_tags.id', '=', 'crawl_bookmarks_tags.crawlTagId')
    .where('crawl_bookmarks.pathname', urlParsed.pathname)
    .groupBy('crawl_bookmarks.id')

  // execute query
  return await massageBookmarkRow(await db.get(sql))
}

/**
 * @description
 * Get crawled bookmark.
 *
 * @param {string} author - The URL of the author of the bookmark
 * @param {string} href - The href of the bookmark
 * @returns {Promise<Bookmark>}
 */
export async function getBookmarkByHref (author, href) {
  href = normalizeTopicUrl(href)

  // build query
  var sql = knex('crawl_bookmarks')
    .select('crawl_bookmarks.*')
    .select('crawl_sources.url as crawlSourceUrl')
    .select('crawl_sources.isPrivate as isPrivate')
    .select(knex.raw('group_concat(crawl_tags.tag, ",") as tags'))
    .innerJoin('crawl_sources', function () {
      this.on('crawl_sources.id', '=', 'crawl_bookmarks.crawlSourceId')
        .andOn('crawl_sources.url', '=', knex.raw('?', author))
    })
    .leftJoin('crawl_bookmarks_tags', 'crawl_bookmarks_tags.crawlBookmarkId', '=', 'crawl_bookmarks.id')
    .leftJoin('crawl_tags', 'crawl_tags.id', '=', 'crawl_bookmarks_tags.crawlTagId')
    .where('crawl_bookmarks.href', href)
    .groupBy('crawl_bookmarks.id')

  // execute query
  return await massageBookmarkRow(await db.get(sql))
};

/**
 * @description
 * Get crawled bookmark by the local user.
 *
 * @param {Object} userSession - The current user session
 * @param {string} href - The href of the bookmark
 * @returns {Promise<Bookmark>}
 */
export async function getOwnBookmarkByHref (userSession, href) {
  var bookmarks = await Promise.all([
    getBookmarkByHref(filesystem.get().url, href),
    getBookmarkByHref(userSession.url, href)
  ])
  return bookmarks[0] || bookmarks[1]
};

/**
 * @description
 * Create a new bookmark.
 *
 * @param {DaemonDatArchive} archive - where to write the bookmark to.
 * @param {Object} bookmark
 * @param {string} bookmark.href
 * @param {string} bookmark.title
 * @param {string} [bookmark.description]
 * @param {string|string[]} [bookmark.tags]
 * @returns {Promise<string>} url
 */
export async function addBookmark (archive, bookmark) {
  if (bookmark && typeof bookmark.tags === 'string') bookmark.tags = bookmark.tags.split(' ')

  var bookmarkObject = {
    type: JSON_TYPE,
    href: normalizeTopicUrl(bookmark.href),
    title: bookmark.title,
    description: bookmark.description,
    tags: bookmark.tags,
    createdAt: (new Date()).toISOString()
  }

  var valid = validateBookmark(bookmarkObject)
  if (!valid) throw ajv.errorsText(validateBookmark.errors)

  var filename = slugifyUrl(bookmarkObject.href)
  var filepath = `/.data/bookmarks/${filename}.json`
  await ensureDirectory(archive, '/.data/bookmarks')
  await archive.pda.writeFile(filepath, JSON.stringify(bookmarkObject, null, 2))
  await uwg.crawlSite(archive)
  return archive.url + filepath
};

/**
 * @description
 * Delete an existing bookmark
 *
 * @param {DaemonDatArchive} archive - where to write the bookmark to.
 * @param {string} href - the href of the bookmark.
 * @returns {Promise<void>}
 */
export async function removeBookmarkByHref (archive, href) {
  assert(typeof href === 'string', 'Remove() must be provided a valid URL string')

  // build query
  var sql = knex('crawl_bookmarks')
    .select('crawl_bookmarks.pathname')
    .innerJoin('crawl_sources', function () {
      this.on('crawl_sources.id', '=', 'crawl_bookmarks.crawlSourceId')
        .andOn('crawl_sources.url', '=', knex.raw('?', archive.url))
    })
    .where('crawl_bookmarks.href', href)

  // execute query
  var record = await db.get(sql)
  if (record) {
    await archive.pda.unlink(record.pathname)
    await uwg.crawlSite(archive)
  }
};

// internal methods
// =

/**
 * @param {string} origin
 * @param {string} pathname
 * @returns {string}
 */
function joinPath (origin, pathname) {
  if (origin.endsWith('/') && pathname.startsWith('/')) {
    return origin + pathname.slice(1)
  }
  if (!origin.endsWith('/') && !pathname.startsWith('/')) {
    return origin + '/' + pathname
  }
  return origin + pathname
}

/**
 * @param {Object} row
 * @returns {Promise<Bookmark>}
 */
async function massageBookmarkRow (row) {
  if (!row) return null
  var author = await archivesDb.getMeta(row.crawlSourceUrl)
  return {
    pathname: row.pathname,
    author,
    href: row.href,
    title: row.title,
    description: row.description,
    tags: row.tags ? row.tags.split(',').filter(Boolean) : [],
    visibility: row.isPrivate ? 'private' : 'public',
    crawledAt: row.crawledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}
