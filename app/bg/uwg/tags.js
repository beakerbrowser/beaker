import assert from 'assert'
import { URL } from 'url'
import * as db from '../dbs/profile-data-db'
import knex from '../lib/knex'
import * as datArchives from '../dat/archives'
import { normalizeSchemaUrl } from './util'

// typedefs
// =

/**
 * @typedef {import('./util').CrawlSourceRecord} CrawlSourceRecord
 * @typedef { import("./site-descriptions").SiteDescription } SiteDescription
 *
 * @typedef {Object} Tag
 * @prop {string} tag
 * @prop {number} count
 */

// exported api
// =

/**
 * @description
 * List bookmark tags.
 *
 * @param {Object} [opts]
 * @param {string|string[]} [opts.author]
 * @param {string} [opts.visibility]
 * @param {string} [opts.sortBy]
 * @param {number} [opts.offset=0]
 * @param {number} [opts.limit]
 * @param {boolean} [opts.reverse]
 * @returns {Promise<Array<Tag>>}
 */
export async function listBookmarkTags (opts) {
  // TODO: handle visibility
  // TODO: sortBy options

  // massage params
  if ('author' in opts) {
    if (!Array.isArray(opts.author)) {
      opts.author = [opts.author]
    }
    opts.author = await Promise.all(opts.author.map(datArchives.getPrimaryUrl))
  }

  // build query
  var sql = knex('crawl_tags')
    .select('crawl_tags.tag')
    .select(knex.raw('count(crawl_tags.id) as count'))
    .innerJoin('crawl_bookmarks_tags', 'crawl_bookmarks_tags.crawlTagId', '=', 'crawl_tags.id')
    .innerJoin('crawl_bookmarks', 'crawl_bookmarks_tags.crawlBookmarkId', '=', 'crawl_bookmarks.id')
    .leftJoin('crawl_sources', 'crawl_bookmarks.crawlSourceId', '=', 'crawl_sources.id')
    .orderBy('crawl_tags.tag', opts.reverse ? 'DESC' : 'ASC')
    .groupBy('crawl_tags.tag')
  if (opts.author) {
    sql = sql.whereIn('crawl_sources.url', opts.author)
  }
  if (opts && opts.limit) sql = sql.limit(opts.limit)
  if (opts && opts.offset) sql = sql.offset(opts.offset)

  // execute query
  var rows = await db.all(sql)
  return rows.map(row => ({
    tag: row.tag,
    count: +row.count
  }))
};
