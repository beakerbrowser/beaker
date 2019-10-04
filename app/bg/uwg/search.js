import _groupBy from 'lodash.groupby'
import _uniqWith from 'lodash.uniqwith'
import * as db from '../dbs/profile-data-db'
import * as historyDb from '../dbs/history'
import * as archivesDb from '../dbs/archives'
import * as datArchives from '../dat/archives'
import * as filesystem from '../filesystem/index'
import * as datLibrary from '../filesystem/dat-library'
import * as follows from './follows'
import * as bookmarks from './bookmarks'
import knex from '../lib/knex'
import libTools from '@beaker/library-tools'

const SITE_TYPES = Object.values(libTools.getCategoriesMap()).filter(Boolean)

// typedefs
// =

/**
 * @typedef {import("../filesystem/dat-library").LibraryDat} LibraryDat
 * @typedef {import('../dbs/archives').LibraryArchiveMeta} LibraryArchiveMeta
 *
 * @typedef {Object} SuggestionResults
 * @prop {Array<Object>} bookmarks
 * @prop {(undefined|Array<Object>)} history
 * @prop {Array<Object>} modules
 * @prop {Array<Object>} people
 * @prop {Array<Object>} templates
 * @prop {Array<Object>} themes
 * @prop {Array<Object>} websites
 *
 * TODO: define the SuggestionResults values
 *
 * @typedef {Object} SearchResults
 * @prop {number} highlightNonce - A number used to create perimeters around text that should be highlighted.
 * @prop {Array<SearchResult>} results
 *
 * @typedef {Object} SearchResult
 ^ @prop {string} resultType
 * @prop {LibraryArchiveMeta} author
 * @prop {string} href
 * @prop {Object} record
 */

// exported api
// =

/**
 * @description
 * Get suggested content of various types.
 *
 * @param {string} user - The current user's URL.
 * @param {string} [query=''] - The search query.
 * @param {Object} [opts={}]
 * @returns {Promise<SuggestionResults>}
 */
export async function listSuggestions (user, query = '', opts = {}) {
  var suggestions = {
    bookmarks: [],
    history: undefined,
    modules: [],
    people: [],
    templates: [],
    themes: [],
    websites: []
  }
  const filterFn = a => query ? ((a.url || a.href).includes(query) || a.title.toLowerCase().includes(query)) : true
  const sortFn = (a, b) => (a.title||'').localeCompare(b.title||'')
  function dedup (arr) {
    var hits = new Set()
    return arr.filter(item => {
      if (hits.has(item.url)) return false
      hits.add(item.url)
      return true
    })
  }

  // bookmarks
  var bookmarkResults = await bookmarks.list({
    author: [filesystem.get().url, user]
  })
  bookmarkResults = bookmarkResults.filter(filterFn)
  bookmarkResults.sort(sortFn)
  bookmarkResults = bookmarkResults.slice(0, 12)
  suggestions.bookmarks = bookmarkResults.map(b => ({title: b.title, url: b.href}))

  // modules
  suggestions.modules = (await datLibrary.list({type: 'unwalled.garden/module'})).map(site => ({title: site.meta.title, url: `dat://${site.key}`}))
  suggestions.modules = suggestions.modules.filter(filterFn)
  suggestions.modules.sort(sortFn)

  // people
  suggestions.people = (await follows.list({author: user})).map(({topic}) => topic)
  suggestions.people = (await datLibrary.list({type: 'unwalled.garden/person'}))
    .map(site => ({title: site.meta.title, url: `dat://${site.key}`}))
    .concat(suggestions.people)
  suggestions.people = dedup(suggestions.people)
  suggestions.people = suggestions.people.filter(filterFn)
  suggestions.people.sort(sortFn)

  // templates
  suggestions.templates = (await datLibrary.list({type: 'unwalled.garden/template'})).map(site => ({title: site.meta.title, url: `dat://${site.key}`}))
  suggestions.templates = suggestions.templates.filter(filterFn)
  suggestions.templates.sort(sortFn)
  suggestions.templates = suggestions.templates.map(site => ({title: site.meta.title, url: site.meta.url}))

  // themes
  suggestions.themes = (await datLibrary.list({type: 'unwalled.garden/theme'})).map(site => ({title: site.meta.title, url: `dat://${site.key}`}))
  suggestions.themes = suggestions.themes.filter(filterFn)
  suggestions.themes.sort(sortFn)

  // websites
  suggestions.websites = (await datLibrary.list())
    .filter(w => (!w.meta.type || !SITE_TYPES.includes(w.meta.type))) // filter out other site types
    .map(site => ({title: site.meta.title, url: `dat://${site.key}`}))
  suggestions.websites = suggestions.websites.filter(filterFn)
  suggestions.websites.sort(sortFn)

  if (query) {
    // history
    var historyResults = await historyDb.search(query)
    suggestions.history = historyResults.slice(0, 12)
    suggestions.history.sort((a, b) => a.url.length - b.url.length) // shorter urls at top
  }

  return suggestions
};

/**
 * @description
 * Run a search query against crawled data.
 *
 * @param {string} user - The current user's URL.
 * @param {Object} opts
 * @param {string} [opts.query] - The search query.
 * @param {string|string[]} [opts.datasets] - Filter results to the given datasets. Defaults to undefined. Valid values: undefined, 'dats', 'people', 'statuses', 'bookmarks'.
 * @param {number} [opts.since] - Filter results to items created since the given timestamp.
 * @param {number} [opts.hops=1] - How many hops out in the user's follow graph should be included? Valid values: 1, 2.
 * @param {number} [opts.offset]
 * @param {number} [opts.limit = 20]
 * @returns {Promise<SearchResults>}
 */
export async function query (user, opts) {
  try {
  const highlightNonce =  (Math.random() * 1e3)|0
  const startHighlight = `{${highlightNonce}}`
  const endHighlight = `{/${highlightNonce}}`

  var searchResults = {
    highlightNonce,
    results: []
  }
  var {query, hops, datasets, since, offset, limit} = Object.assign({}, {
    query: undefined,
    hops: 2,
    datasets: undefined,
    since: 0,
    offset: 0,
    limit: 20
  }, opts)
  hops = Math.min(Math.max(Math.floor(hops), 1), 2) // clamp to [1, 2] for now
  const shouldInclude = v => typeof datasets === 'undefined' || (Array.isArray(datasets) ? (datasets.includes(v)) : datasets === v)

  // prep search terms
  if (query && typeof query === 'string') {
    query = query
      .replace(/[^a-z0-9]/ig, ' ') // strip symbols that sqlite interprets.
      .toLowerCase() // all lowercase. (uppercase is interpretted as a directive by sqlite.)
    query += '*' // match prefixes
  }

  // get user's crawl_source ids (public and private)
  var userCrawlSourceIds
  {
    let [privateRes, publicRes] = await Promise.all([
      db.get(`SELECT crawl_sources.id FROM crawl_sources LEFT JOIN profiles ON profiles.id = 0 WHERE crawl_sources.url = profiles.url`),
      db.get(`SELECT id FROM crawl_sources WHERE url = ?`, [user])
    ])
    userCrawlSourceIds = [privateRes.id, publicRes.id]
  }

  // construct set of crawl sources to query
  var crawlSourceIds
  if (hops === 2) {
    // the user and all followed sources
    let res = await db.all(`
      SELECT id FROM crawl_sources src
        INNER JOIN crawl_follows follows ON follows.destUrl = src.url AND follows.crawlSourceId = ?
    `, [userCrawlSourceIds[1]])
    crawlSourceIds = userCrawlSourceIds.concat(res.map(({id}) => id))
  } else if (hops === 1) {
    // just the user's dats
    crawlSourceIds = userCrawlSourceIds
  }

  // run queries
  if (shouldInclude('dats')) {
    // SITES
    let rows = await db.all(buildDatsQuery({
      query,
      crawlSourceIds,
      since,
      limit,
      offset,
      startHighlight,
      endHighlight
    }))
    rows = await Promise.all(rows.map(massageDatSearchResult))
    searchResults.results = searchResults.results.concat(rows)
  }
  if (shouldInclude('people')) {
    // PEOPLE
    let rows = await db.all(buildPeopleQuery({
      query,
      crawlSourceIds,
      since,
      limit,
      offset,
      startHighlight,
      endHighlight
    }))
    rows = _uniqWith(rows, (a, b) => a.url === b.url) // remove duplicates
    rows = await Promise.all(rows.map(massagePersonSearchResult))
    searchResults.results = searchResults.results.concat(rows)
  }
  if (shouldInclude('statuses')) {
    // POSTS
    let rows = await db.all(buildStatusesQuery({
      query,
      crawlSourceIds,
      since,
      limit,
      offset,
      startHighlight,
      endHighlight
    }))
    rows = await Promise.all(rows.map(massageStatusSearchResult))
    searchResults.results = searchResults.results.concat(rows)
  }
  if (shouldInclude('bookmarks')) {
    // BOOKMARKS
    let rows = await db.all(buildBookmarksQuery({
      query,
      crawlSourceIds,
      since,
      limit,
      offset,
      startHighlight,
      endHighlight
    }))
    rows = await Promise.all(rows.map(massageBookmarkSearchResult))
    searchResults.results = searchResults.results.concat(rows)
  }

  // sort and apply limit again
  searchResults.results.sort((a, b) => b.record.crawledAt - a.record.crawledAt)
  searchResults.results = searchResults.results.slice(0, limit)

  return searchResults
} catch (e) {
  console.log(e)
  throw e
}
};

// internal methods
// =

function buildDatsQuery ({query, crawlSourceIds, since, limit, offset, startHighlight, endHighlight}) {
  let sql = knex(query ? 'crawl_dats_fts_index' : 'crawl_dats')
    .select('crawl_dats.key AS key')
    .select('crawl_dats.type AS type')
    .select('crawl_sources.url AS authorUrl')
    .select('crawl_dats.crawledAt')
    .whereIn('crawl_dats.crawlSourceId', crawlSourceIds)
    .where('crawl_dats.crawledAt', '>=', since)
    .orderBy('crawl_dats.crawledAt')
    .limit(limit)
    .offset(offset)
  if (query) {
    sql = sql
      .select(knex.raw(`SNIPPET(crawl_dats_fts_index, 0, '${startHighlight}', '${endHighlight}', '...', 25) AS title`))
      .select(knex.raw(`SNIPPET(crawl_dats_fts_index, 1, '${startHighlight}', '${endHighlight}', '...', 25) AS description`))
      .innerJoin('crawl_dats', 'crawl_dats.rowid', '=', 'crawl_dats_fts_index.rowid')
      .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_dats.crawlSourceId')
      .whereRaw('crawl_dats_fts_index MATCH ?', [query])
  } else {
    sql = sql
      .select('crawl_dats.title')
      .select('crawl_dats.description')
      .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_dats.crawlSourceId')
  }
  return sql
}

function buildPeopleQuery ({query, crawlSourceIds, since, limit, offset, startHighlight, endHighlight}) {
  let sql = knex(query ? 'archives_meta_fts_index' : 'archives_meta')
    .select('crawl_follows.destUrl as url')
    .select('archives_meta.type')
    .select('crawl_sources.url AS authorUrl')
    .select('crawl_follows.crawledAt')
    .whereIn('crawl_follows.crawlSourceId', crawlSourceIds)
    .where('crawl_follows.crawledAt', '>=', since)
    .orderBy('crawl_follows.crawledAt')
    .limit(limit)
    .offset(offset)
  if (query) {
    sql = sql
      .select(knex.raw(`SNIPPET(archives_meta_fts_index, 0, '${startHighlight}', '${endHighlight}', '...', 25) AS title`))
      .select(knex.raw(`SNIPPET(archives_meta_fts_index, 1, '${startHighlight}', '${endHighlight}', '...', 25) AS description`))
      .innerJoin('archives_meta', 'archives_meta.rowid', '=', 'archives_meta_fts_index.rowid')
      .joinRaw(`INNER JOIN crawl_follows ON ('dat://' || archives_meta.key) = crawl_follows.destUrl`)
      .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_follows.crawlSourceId')
      .whereRaw('archives_meta_fts_index MATCH ?', [query])
  } else {
    sql = sql
      .select('archives_meta.title')
      .select('archives_meta.description')
      .joinRaw(`INNER JOIN crawl_follows ON ('dat://' || archives_meta.key) = crawl_follows.destUrl`)
      .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_follows.crawlSourceId')
  }
  return sql
}

function buildStatusesQuery ({query, crawlSourceIds, since, limit, offset, startHighlight, endHighlight}) {
  let sql = knex(query ? 'crawl_statuses_fts_index' : 'crawl_statuses')
    .select('crawl_statuses.pathname')
    .select('crawl_statuses.crawledAt')
    .select('crawl_statuses.createdAt')
    .select('crawl_statuses.updatedAt')
    .select('crawl_sources.url AS authorUrl')
    .whereIn('crawl_statuses.crawlSourceId', crawlSourceIds)
    .andWhere('crawl_statuses.crawledAt', '>=', since)
    .orderBy('crawl_statuses.crawledAt')
    .limit(limit)
    .offset(offset)
  if (query) {
    sql = sql
      .select(knex.raw(`SNIPPET(crawl_statuses_fts_index, 0, '${startHighlight}', '${endHighlight}', '...', 25) AS body`))
      .innerJoin('crawl_statuses', 'crawl_statuses.rowid', '=', 'crawl_statuses_fts_index.rowid')
      .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_statuses.crawlSourceId')
      .whereRaw('crawl_statuses_fts_index MATCH ?', [query])
  } else {
    sql = sql
      .select('crawl_statuses.body')
      .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_statuses.crawlSourceId')
  }
  return sql
}

function buildBookmarksQuery ({query, crawlSourceIds, since, limit, offset, startHighlight, endHighlight}) {
  let sql = knex(query ? 'crawl_bookmarks_fts_index' : 'crawl_bookmarks')
    .select('crawl_bookmarks.pathname')
    .select('crawl_bookmarks.crawledAt')
    .select('crawl_bookmarks.createdAt')
    .select('crawl_bookmarks.updatedAt')
    .select('crawl_sources.url AS authorUrl')
    .whereIn('crawl_bookmarks.crawlSourceId', crawlSourceIds)
    .andWhere('crawl_bookmarks.crawledAt', '>=', since)
    .orderBy('crawl_bookmarks.crawledAt')
    .limit(limit)
    .offset(offset)
  if (query) {
    sql = sql
      .select('crawl_bookmarks.href')
      .select(knex.raw(`SNIPPET(crawl_bookmarks_fts_index, 0, '${startHighlight}', '${endHighlight}', '...', 25) AS title`))
      .select(knex.raw(`SNIPPET(crawl_bookmarks_fts_index, 1, '${startHighlight}', '${endHighlight}', '...', 25) AS description`))
      .innerJoin('crawl_bookmarks', 'crawl_bookmarks.rowid', '=', 'crawl_bookmarks_fts_index.rowid')
      .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_bookmarks.crawlSourceId')
      .whereRaw('crawl_bookmarks_fts_index MATCH ?', [query])
  } else {
    sql = sql
      .select('crawl_bookmarks.href')
      .select('crawl_bookmarks.title')
      .select('crawl_bookmarks.description')
      .innerJoin('crawl_sources', 'crawl_sources.id', '=', 'crawl_bookmarks.crawlSourceId')
  }
  return sql
}

/**
 * @param {Object} row
 * @returns {Promise<SearchResult>}
 */
async function massageDatSearchResult (row) {
  return {
    resultType: 'dat',
    author: await archivesDb.getMeta(row.authorUrl),
    href: `dat://${row.key}`,
    record: {
      title: row.title,
      description: row.description,
      crawledAt: row.crawledAt
    }
  }
}

/**
 * @param {Object} row
 * @returns {Promise<SearchResult>}
 */
async function massagePersonSearchResult (row) {
  return {
    resultType: 'person',
    author: await archivesDb.getMeta(row.authorUrl),
    href: row.url,
    record: {
      title: row.title,
      description: row.description,
      type: row.type,
      crawledAt: row.crawledAt
    }
  }
}

/**
 * @param {Object} row
 * @returns {Promise<SearchResult>}
 */
async function massageStatusSearchResult (row) {
  return {
    resultType: 'status',
    author: await archivesDb.getMeta(row.authorUrl),
    href: row.authorUrl + row.pathname,
    record: {
      body: row.body,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      crawledAt: row.crawledAt
    }
  }
}

/**
 * @param {Object} row
 * @returns {Promise<SearchResult>}
 */
async function massageBookmarkSearchResult (row) {
  return {
    resultType: 'bookmark',
    author: await archivesDb.getMeta(row.authorUrl),
    href: row.authorUrl + row.pathname,
    record: {
      href: row.href,
      title: row.title,
      description: row.description,
      // tags: row.tags,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      crawledAt: row.crawledAt
    }
  }
}