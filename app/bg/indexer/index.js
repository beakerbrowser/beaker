/**
 * The indexer creates the following datasets:
 * 
 *  - List of sites that have been indexed
 *  - List of records that have been indexed
 *  - Metadata & file content for all indexed records (including FTS index)
 *  - Notifications for records which are relevant to the user
 * 
 * The indexer works by periodically listing all sites that we're interested in and
 * fetching a list of file updates since the last time the site was indexed. Those
 * updates are then passed into a set of "index definitions" which pick which updates
 * to index based on their metadata.
 * 
 * Sites which the user has "lost interest in" (ie unsubscribed from) will be deleted
 * from the index.
 * 
 * Current limitations:
 * 
 *  - Unable to index http/s sites
 *  - If any updates to a hyper site failes to index, the site will stop being indexed
 *  - Only subscribed and owned sites are indexed
 */

import { app } from 'electron'
import knex from 'knex'
import { graphql, buildSchema } from 'graphql'
import graphqlFields from 'graphql-fields'
import { dirname, extname } from 'path'
import { EventEmitter } from 'events'
import emitStream from 'emit-stream'
import markdownLinkExtractor from 'markdown-link-extractor'
import { PermissionsError } from 'beaker-error-constants'
import { attachOnConflictDoNothing } from 'knex-on-conflict-do-nothing'
import { attachOnConflictDoUpdate } from '../lib/db'
import * as path from 'path'
import mkdirp from 'mkdirp'
import * as logLib from '../logger'
const logger = logLib.get().child({category: 'indexer'})
import { TICK_INTERVAL, METADATA_KEYS } from './const'
import { SCHEMA as GRAPHQL_SCHEMA } from './graphql'
import * as hyperbees from './hyperbees'
import * as local from './local'
import lock from '../../lib/lock'
import { timer } from '../../lib/time'
import { joinPath, toNiceUrl, parseSimplePathSpec } from '../../lib/strings'
import { normalizeOrigin, normalizeUrl, isUrlLike } from '../../lib/urls'
import * as validation from './validation'
import {
  getIsFirstRun,
  getIndexState,
  updateIndexState,
  setSiteFlags,
  listMyOrigins,
  listOriginsToIndex,
  listOriginsToCapture,
  listOriginsToDeindex,
  loadSite,
  checkShouldExcludePrivate,
  parseUrl,
  toArray,
  parallel
} from './util'

/**
 * @typedef {import('./const').Site} Site
 * @typedef {import('./const').SiteDescription} SiteDescription
 * @typedef {import('./const').RecordUpdate} RecordUpdate
 * @typedef {import('./const').ParsedUrl} ParsedUrl
 * @typedef {import('./const').RangeQuery} RangeQuery
 * @typedef {import('./const').LinkQuery} LinkQuery
 * @typedef {import('./const').RecordDescription} RecordDescription
 * @typedef {import('../../lib/session-permissions').EnumeratedSessionPerm} EnumeratedSessionPerm
 * @typedef {import('../filesystem/query').FSQueryResult} FSQueryResult
 */

// globals
// =

var db
var graphqlSchema
var state = {
  status: {
    task: '',
    nextRun: undefined
  },
  sites: {},
  queue: [],
  targets: []
}
var events = new EventEmitter()

// exported api
// =

/**
 * @param {Object} opts
 * @param {string} opts.userDataPath
 */
export async function setup (opts) {
  mkdirp.sync(path.join(opts.userDataPath, 'Indexes'))
  attachOnConflictDoNothing(knex)
  attachOnConflictDoUpdate(knex)
  db = knex({
    client: 'sqlite3',
    connection: {
      filename: path.join(opts.userDataPath, 'Indexes', 'beaker.db')
    },
    useNullAsDefault: true
  })
  await db.migrate.latest({directory: path.join(app.getAppPath(), 'bg', 'indexer', 'migrations')})
  graphqlSchema = buildSchema(GRAPHQL_SCHEMA)
  await hyperbees.setup()
  tick()

  // fetch current sites states for debugging
  {
    let states = await db('sites')
      .select('origin', 'last_indexed_version', 'last_indexed_ts')
    for (let state of states) {
      DEBUGGING.setSiteState({
        url: state.origin,
        progress: undefined,
        last_indexed_version: state.last_indexed_version,
        last_indexed_ts: state.last_indexed_ts,
        error: undefined
      })
    }
  }
}

class GraphQLBase {
  constructor (data) {
    for (let k in data) {
      this[k] = data[k]
    }
  }
}

class GraphQLRecord extends GraphQLBase {
  async site (args, ctx) {
    let site = await getSite(this.url)
    return new GraphQLSite(site)
  }

  // linkedSites(indexes: [String]): [Site]
  async linkedSites (args, ctx) {
    var siteUrls = new Set(this.links.map(link => link.origin)) // dedup
    var sites = await Promise.all(Array.from(siteUrls).map(link => getSite(link)))
    return sites.filter(Boolean).map(site => new GraphQLSite(site))
  }

  // backlinks(paths: [String], indexes: [String]): [Record]
  async backlinks (args, ctx, ast) {
    let records = await query(Object.assign({links: {url: this.url}}, args), {
      includeContent: queryAstWants(ast, 'content'),
      includeLinks: queryAstWants(ast, 'links'),
      permissions: ctx.permissions
    })
    return records.map(record => new GraphQLRecord(record))
  }

  // backlinkCount(paths: [String], indexes: [String]): Long
  async backlinkCount (args, ctx) {
    return count(Object.assign({links: {url: this.url}}, args), {
      permissions: ctx.permissions
    })
  }
}

class GraphQLSite extends GraphQLBase {
  // backlinks(paths: [String], indexes: [String]): [Record]
  async backlinks (args, ctx, ast) {
    let records = await query(Object.assign({links: {origin: this.url}}, args), {
      includeContent: queryAstWants(ast, 'content'),
      includeLinks: queryAstWants(ast, 'links'),
      permissions: ctx.permissions
    })
    return records.map(record => new GraphQLRecord(record))
  }

  // backlinkCount(paths: [String], indexes: [String]): [Record]
  async backlinkCount (args, ctx) {
    return count(Object.assign({links: {origin: this.url}}, args), {
      permissions: ctx.permissions
    })
  }
  
  // records(search: String, paths: [String], links: LinkQuery, indexes: [String], before: RangeQuery, after: RangeQuery, sort: Sort, offset: Int, limit: Int, reverse: Boolean): [Record]
  async records (args, ctx, ast) {
    var records = await query(Object.assign({origins: [this.url]}, args), {
      permissions: ctx.permissions,
      includeContent: queryAstWants(ast, 'content'),
      includeLinks: queryAstWants(ast, 'links')
    })
    return records.map(record => new GraphQLRecord(record))
  }
  
  // recordCount(search: String, paths: [String], links: LinkQuery, indexes: [String], before: RangeQuery, after: RangeQuery): [Record]
  async recordCount (args, ctx) {
    return count(Object.assign({origins: [this.url]}, args), {
      permissions: ctx.permissions
    })
  }
}

const graphqlRoot = {
  // record(url: String!): Record
  async record (args, ctx, ast) {
    var record = await get(args.url, {
      permissions: ctx.permissions,
      includeContent: queryAstWants(ast, 'content'),
      includeLinks: queryAstWants(ast, 'links')
    })
    return record ? new GraphQLRecord(record) : undefined
  },
  
  // records(search: String, origins: [String], paths: [String], links: LinkQuery, indexes: [String], before: RangeQuery, after: RangeQuery, sort: Sort, offset: Int, limit: Int, reverse: Boolean): [Record]
  async records (args, ctx, ast) {
    var records = await query(args, {
      permissions: ctx.permissions,
      includeContent: queryAstWants(ast, 'content'),
      includeLinks: queryAstWants(ast, 'links')
    })
    return records.map(record => new GraphQLRecord(record))
  },
  
  // recordCount(search: String, origins: [String], paths: [String], links: LinkQuery, indexes: [String], before: RangeQuery, after: RangeQuery): CountResponse
  async recordCount (args, ctx) {
    return count(args, {permissions: ctx.permissions})
  },

  // site(url: String!, cached: Boolean): Site
  async site (args, ctx) {
    var site = await getSite(args.url, {cacheOnly: args.cached})
    return new GraphQLSite(site)
  },

  // sites(indexes: [String], writable: Boolean, offset: Int, limit: Int, reverse: Boolean): [Site]
  async sites (args, ctx) {
    var sites = await listSites(args)
    return sites.map(site => new GraphQLSite(site))
  }
}

export async function gql (query, variables, permissions) {
  var res = await graphql(graphqlSchema, query, graphqlRoot, {permissions}, variables)
  if (res.errors) throw new Error(res.errors[0])
  return res.data
}

export async function clearAllData () {
  try {
    var release = await lock('beaker-indexer')
    await db('sites').del()
  } finally {
    release()
  }
}

/**
 * @param {String} url 
 * @param {Object} [opts]
 * @param {Object} [opts.cacheOnly]
 * @returns {Promise<SiteDescription>}
 */
export async function getSite (url, opts) {
  var origin = validation.origin('url', url)
  if (!origin.startsWith('hyper://')) return undefined // hyper only for now
  var siteRows = await db('sites').select('*').where({origin}).limit(1)
  if (siteRows[0]) {
    return {
      origin: siteRows[0].origin,
      url: siteRows[0].origin,
      title: siteRows[0].title || toNiceUrl(siteRows[0].origin),
      description: siteRows[0].description,
      writable: Boolean(siteRows[0].writable),
      index: 'local'
    }
  }
  var hyperbeeResult = await timer(3e3, () => hyperbees.getSite(url))
  if (hyperbeeResult) {
    return hyperbeeResult
  }
  if (opts?.cacheOnly) {
    return {
      origin: origin,
      url: origin,
      title: toNiceUrl(origin),
      description: '',
      writable: false,
      index: 'live'
    }
  }
  var site = await timer(3e3, () => loadSite(db, origin))
  return {
    origin: site.origin,
    url: site.origin,
    title: site.title,
    description: site.description,
    writable: site.writable,
    index: 'live'
  }
}

/**
 * @param {Object} [opts]
 * @param {String} [opts.search]
 * @param {String[]} [opts.indexes] - 'local', 'network', url of a specific hyperbee index
 * @param {Boolean} [opts.writable]
 * @param {Number} [opts.offset]
 * @param {Number} [opts.limit]
 * @returns {Promise<SiteDescription[]>}
 */
export async function listSites (opts) {
  opts = opts && typeof opts === 'object' ? opts : {}
  opts.indexes = validation.arrayOfStrings('indexes', opts.indexes) || ['local']
  opts.offset = validation.number('offset', opts.offset)
  opts.limit = validation.number('limit', opts.limit)
  opts.writable = validation.boolean('writable', opts.writable)

  var results = []
  if (opts.indexes.includes('local')) {
    results.push(await local.listSites(db, opts))
  }
  if (opts.indexes.includes('network')) {
    try {
      results.push(await timer(5e3, () => hyperbees.listSites(opts)))
    } catch (e) {
      logger.silly(`Failed to fetch network sites list (${e.toString()})`, {error: e})
    }
  }

  var sites
  if (results.length === 1) {
    sites = results[0]
  } else {
    sites = []
    for (let result of results.flat()) {
      if (!sites.find(s => s.url === result.url)) {
        sites.push(result)
      }
    }
  }

  return sites
}

/**
 * @param {String} url 
 * @param {Object} [etc]
 * @param {Boolean} [etc.includeContent]
 * @param {Boolean} [etc.includeLinks]
 * @param {Object} [etc.permissions]
 * @param {EnumeratedSessionPerm[]} [etc.permissions.query]
 * @returns {Promise<RecordDescription>}
 */
export async function get (url, {permissions, includeLinks, includeContent} = {}) {
  url = validation.string('url', url)
  let urlp = parseUrl(url)
  if (permissions?.query) {
    if (urlp.origin === 'hyper://private') {
      let prefix = dirname(urlp.pathname)
      let extension = extname(urlp.pathname)
      let perm = permissions.query.find(perm => perm.prefix === prefix && perm.extension === extension)
      if (!perm) throw new PermissionsError()
    }
  }
  var rows = await db('sites')
    .leftJoin('records', 'sites.rowid', 'records.site_rowid')
    .select('*', 'records.rowid as record_rowid')
    .where({origin: urlp.origin, path: urlp.path})
    .limit(1)
  if (!rows[0]) {
    return getLiveRecord(url, {includeLinks, includeContent})
  }

  var record_rowid = rows[0].record_rowid
  var result = {
    type: 'file',
    path: urlp.path,
    url: urlp.origin + urlp.path,
    ctime: rows[0].ctime,
    mtime: rows[0].mtime,
    rtime: rows[0].rtime,
    metadata: {},
    links: [],
    index: 'local',
    content: undefined
  }

  rows = await db('records_data').select('*').where({record_rowid})
  for (let row of rows) {
    if (row.key === METADATA_KEYS.content) {
      result.content = row.value
    } else {
      result.metadata[row.key] = row.value
    }
  }

  rows = await db('records_links').select('*').where({record_rowid})
  for (let row of rows) {
    result.links.push({
      source: row.source,
      url: row.href_origin + row.href_path,
      origin: row.href_origin,
      path: row.href_path,
    })
  }

  return result
}

/**
 * @param {Object} [opts]
 * @param {String} [opts.search]
 * @param {String[]} [opts.origins]
 * @param {String[]} [opts.excludeOrigins]
 * @param {String[]} [opts.paths]
 * @param {LinkQuery} [opts.links]
 * @param {String[]} [opts.indexes] - 'local', 'network', url of a specific hyperbee index
 * @param {RangeQuery} [opts.before]
 * @param {RangeQuery} [opts.after]
 * @param {String} [opts.sort]
 * @param {Number} [opts.offset]
 * @param {Number} [opts.limit]
 * @param {Boolean} [opts.reverse]
 * @param {Object} [etc]
 * @param {Boolean} [etc.includeContent]
 * @param {Boolean} [etc.includeLinks]
 * @param {Object} [etc.permissions]
 * @param {EnumeratedSessionPerm[]} [etc.permissions.query]
 * @returns {Promise<RecordDescription[]>}
 */
export async function query (opts, {includeContent, includeLinks, permissions} = {}) {
  opts = opts && typeof opts === 'object' ? opts : {}
  opts.search = validation.string('search', opts.search)
  opts.origins = validation.arrayOfOrigins('origins', opts.origins)
  opts.excludeOrigins = validation.arrayOfOrigins('excludeOrigins', opts.excludeOrigins)
  opts.paths = validation.arrayOfStrings('paths', opts.paths)
  opts.links = validation.linkQuery('links', opts.links)
  opts.indexes = validation.arrayOfStrings('indexes', opts.indexes) || ['local']
  opts.before = validation.rangeQuery('before', opts.before)
  opts.after = validation.rangeQuery('after', opts.after)
  opts.sort = validation.sort('sort', opts.sort) || 'crtime'
  opts.offset = validation.number('offset', opts.offset) || 0
  opts.limit = validation.number('limit', opts.limit)
  opts.reverse = validation.boolean('reverse', opts.reverse)

  var results = []
  if (opts.indexes.includes('local')) {
    results.push(await local.query(db, opts, {permissions}))
  }
  if (opts.indexes.includes('network')) {
    let networkRes = await timer(5e3, () => hyperbees.query(opts, {
      existingResults: results[0]?.records
    }).catch(e => undefined))
    if (networkRes) {
      results.push(networkRes)
    }
  }

  if (!results[0]) return []
  
  // identify origins which we need to live-query
  var missedOrigins = results[0].missedOrigins || []
  if (results[1] && results[1].missedOrigins?.length) {
    missedOrigins = missedOrigins.filter(org => results[1].missedOrigins.includes(org))
  }

  if (missedOrigins.length) {
    // fetch the live records
    let records
    for (let origin of missedOrigins) {
      try {
        records = (records || []).concat(
          await timer(3e3, () => listLiveRecords(origin, opts, {includeContent, includeLinks}))
        )
      } catch (e) {
        logger.silly(`Failed to live-list records from ${origin}`, {error: e})
      }
    }
    if (records && records?.length) {
      results.push({records})
    }
  }

  var records
  if (opts.indexes.includes('network') || results.length > 0) {
    // merge and sort
    records = results.reduce((acc, res) => acc.concat(res.records), [])
    records.sort((a, b) => {
      if (opts.sort === 'ctime') {
        return opts.reverse ? (b.ctime - a.ctime) : (a.ctime - b.ctime)
      } else if (opts.sort === 'mtime') {
        return opts.reverse ? (b.mtime - a.mtime) : (a.mtime - b.mtime)
      } else if (opts.sort === 'crtime') {
        let crtimeA = Math.min(a.ctime, a.rtime)
        let crtimeB = Math.min(b.ctime, b.rtime)
        return opts.reverse ? (crtimeB - crtimeA) : (crtimeA - crtimeB)
      } else if (opts.sort === 'mrtime') {
        let mrtimeA = Math.min(a.mtime, a.rtime)
        let mrtimeB = Math.min(b.mtime, b.rtime)
        return opts.reverse ? (mrtimeB - mrtimeA) : (mrtimeA - mrtimeB)
      } else if (opts.sort === 'origin') {
        return b.site.url.localeCompare(a.site.url) * (opts.reverse ? -1 : 1)
      }
    })
    if (typeof opts.offset === 'number' && typeof opts.limit === 'number') {
      records = records.slice(opts.offset, opts.offset + opts.limit)
    } else if (typeof opts.offset === 'number') {
      records = records.slice(opts.offset)
    } else if (typeof opts.limit === 'number') {
      records = records.slice(0, opts.limit)
    }

    // load data as needed
    for (let record of records) {
      if ((includeContent || includeLinks) && record.fetchData) {
        try {
          await timer(3e3, () => record.fetchData())
        } catch {
          // ignore
        }
        delete record.fetchData
      }
    }
  } else {
    records = results[0].records
  }

  return records
}

/**
 * @param {Object} [opts]
 * @param {String[]} [opts.origins]
 * @param {String[]} [opts.excludeOrigins]
 * @param {String[]} [opts.paths]
 * @param {LinkQuery} [opts.links]
 * @param {String[]} [opts.indexes] - 'local' or 'network'
 * @param {RangeQuery} [opts.before]
 * @param {RangeQuery} [opts.after]
 * @param {Object} [etc]
 * @param {Object} [etc.permissions]
 * @param {EnumeratedSessionPerm[]} [etc.permissions.query]
 * @returns {Promise<Number>}
 */
export async function count (opts, {permissions}) {
  opts = opts && typeof opts === 'object' ? opts : {}
  opts.origins = validation.arrayOfOrigins('origins', opts.origins)
  opts.excludeOrigins = validation.arrayOfOrigins('excludeOrigins', opts.excludeOrigins)
  opts.paths = validation.arrayOfStrings('paths', opts.paths)
  opts.links = validation.linkQuery('links', opts.links)
  opts.indexes = validation.arrayOfStrings('indexes', opts.indexes) || ['local']
  opts.before = validation.rangeQuery('before', opts.before)
  opts.after = validation.rangeQuery('after', opts.after)

  var results = []
  if (opts.indexes.includes('local')) {
    results.push(await local.count(db, opts, {
      permissions
    }))
  }
  if (opts.indexes.includes('network')) {
    results.push(await hyperbees.count(opts, {
      existingResultOrigins: results[0]?.includedOrigins
    }))
  }
  
  // identify origins which we need to live-query
  var missedOrigins = results[0].missedOrigins || []
  if (results[1] && results[1].missedOrigins?.length) {
    missedOrigins = missedOrigins.filter(org => results[1].missedOrigins.includes(org))
  }

  if (missedOrigins.length) {
    // fetch the live records
    for (let origin of missedOrigins) {
      try {
        let files = await timer(3e3, () => listLiveRecords(origin, opts))
        results.push({count: files.length})
      } catch (e) {
        logger.silly(`Failed to live-count records from ${origin}`, {error: e})
      }
    }
  }

  return results.reduce((acc, result) => acc + result.count, 0)
}


export async function triggerSiteIndex (origin, {ifIndexingSite} = {ifIndexingSite: false}) {
  origin = normalizeOrigin(origin)
  var myOrigins = await listMyOrigins()
  if (ifIndexingSite) {
    let indexState = await getIndexState(db, origin)
    if (!indexState?.length) return
  }
  await indexSite(origin, myOrigins)
}

export async function triggerSiteDeindex (origin) {
  origin = normalizeOrigin(origin)
  await deindexSite(origin)
}

export function getState () {
  return state
}

export function createEventStream () {
  return emitStream(events)
}

// internal methods
// =

const DEBUGGING = {
  setStatus (task, nextRun) {
    state.status = {task, nextRun}
    events.emit('status-change', {task, nextRun})
  },
  
  setSiteState ({url, progress, last_indexed_version, last_indexed_ts, error}) {
    const siteState = {url, progress, last_indexed_version, last_indexed_ts, error}
    state.sites[url] = siteState
    events.emit('site-state-change', siteState)
  },
  
  setQueue (queue) {
    state.queue = queue.slice() // must slice because we're going to mutate this queue
    events.emit('queue-change', {queue})
  },
  
  moveToTargets (origin) {
    let i = state.queue.indexOf(origin)
    if (i === -1) return
    state.queue.splice(i, 1)
    state.targets.push(origin)
    events.emit('queue-change', {queue: state.queue})
    events.emit('targets-change', {targets: state.targets})
  },
  
  removeTarget (origin) {
    let i = state.targets.indexOf(origin)
    if (i === -1) return
    state.targets.splice(i, 1)
    events.emit('targets-change', {targets: state.targets})
  },
}

/**
 * @returns {Promise<void>}
 */
var _isFirstRun = undefined
async function tick () {
  DEBUGGING.setStatus('indexing')
  try {
    var myOrigins = await listMyOrigins()
    if (typeof _isFirstRun === 'undefined') {
      _isFirstRun = await getIsFirstRun(db)
    }

    var originsToIndex = await listOriginsToIndex(db)
    DEBUGGING.setQueue(originsToIndex)
    await parallel(originsToIndex, indexSite, myOrigins)

    if (_isFirstRun) {
      // immediately re-run now that we've populated with subscription records
      _isFirstRun = false
      originsToIndex = await listOriginsToIndex(db)
      await parallel(originsToIndex, indexSite, myOrigins)
    }

    DEBUGGING.setStatus('capturing metadata')
    var originsToCapture = await listOriginsToCapture()
    DEBUGGING.setQueue(originsToCapture)
    await parallel(originsToCapture, async (origin) => {
      try {
        DEBUGGING.moveToTargets(origin)
        await loadSite(db, origin) // this will capture the metadata of the site
      } catch {}
      DEBUGGING.removeTarget(origin)
    })

    DEBUGGING.setStatus('cleaning up')
    var originsToDeindex = await listOriginsToDeindex(db, originsToIndex)
    DEBUGGING.setQueue(originsToDeindex)
    await parallel(originsToDeindex, deindexSite)
  } finally {
    DEBUGGING.setStatus('waiting', Date.now() + TICK_INTERVAL)
    setTimeout(tick, TICK_INTERVAL)
  }
}

async function indexSite (origin, myOrigins) {
  origin = normalizeOrigin(origin)
  DEBUGGING.moveToTargets(origin)
  var release = await lock(`beaker-indexer:${origin}`)
  var current_version
  var isFirstIndex
  try {
    current_version = undefined
    let site = await loadSite(db, origin, {onIsFirstIndex: () => {
      isFirstIndex = true
      // optimistically indicate in the UI that sync is occurring
      // (we want to do this as quickly as possible to make things responsive)
      DEBUGGING.setSiteState({
        url: origin,
        progress: 0,
        last_indexed_version: 0,
        last_indexed_ts: Date.now(),
        error: undefined
      })
    }})
    if (!site.is_index_target) {
      // is now an index target
      await setSiteFlags(db, site, {is_index_target: true})
    }
    current_version = site.current_version
    if (site.current_version === site.last_indexed_version) {
      return
    }

    logger.silly(`Indexing ${origin} [ v${site.last_indexed_version} -> v${site.current_version} ]`)
    let updates = await site.listUpdates()
    logger.silly(`${updates.length} updates found for ${origin}`)
    if (updates.length === 0) {
      if (!site.is_indexed && site.last_indexed_version > 0) {
        // was indexed prior to site flags were introduced, correct the record
        await setSiteFlags(db, site, {is_indexed: true})
      }
      return
    }

    let progCurr = 0, progTotal = updates.length
    for (let update of updates) {
      DEBUGGING.setSiteState({
        url: site.origin,
        progress: Math.round(progCurr++ / progTotal * 100),
        last_indexed_version: site.current_version,
        last_indexed_ts: Date.now(),
        error: undefined
      })
      if (update.remove) {
        // file deletion
        let res = await db('records').select('rowid').where({
          site_rowid: site.rowid,
          path: update.path
        })
        if (res[0]) await db('records_data').del().where({record_rowid: res[0].rowid})
        res = await db('records').del().where({site_rowid: site.rowid, path: update.path})
        if (+res > 0) {
          logger.silly(`Deindexed ${site.origin}${update.path}`, {origin: site.origin, path: update.path})
        }
      } else {
        // file write
        let extension = extname(update.path)
        let prefix = dirname(update.path)
        let dataEntries = [
          /* records_data.key, records_data.value */
          ...Object.entries(update.metadata).map(([key, value]) => {
            return [key, value]
          })
        ]

        // read content if markdown
        let content, contentLinks
        if (extension === '.md') {
          content = await site.fetch(update.path)
          contentLinks = markdownLinkExtractor(content)
          contentLinks = Array.from(new Set(contentLinks)) // remove duplicates
          dataEntries.push([METADATA_KEYS.content, content])
        }

        // index the base record
        let rowid
        let isNew = true
        try {
          // NOTE
          // on the first indexing of a site, we're going to be syncing a backlog of content
          // this can create a bunch of needless notifications
          // so we allow the rtime to get 'backdated' to avoid that
          // -prf
          let rtime = isFirstIndex ? Math.min(+update.ctime, Date.now()) : Date.now()

          let res = await db('records').insert({
            site_rowid: site.rowid,
            path: update.path,
            prefix,
            extension,
            mtime: update.mtime,
            ctime: update.ctime,
            rtime
          })
          rowid = res[0]
        } catch (e) {
          // TODO can we check the error type for constraint violation?
          isNew = false
          let res = await db('records').select('rowid').where({
            site_rowid: site.rowid,
            path: update.path
          })
          rowid = res[0].rowid
          await db('records').update({
            mtime: update.mtime,
            ctime: update.ctime
          }).where({rowid})
        }

        // index the record's data
        if (!isNew) {
          await Promise.all([
            db('records_data').del().where({record_rowid: rowid}),
            db('records_links').del().where({record_rowid: rowid})
          ])
        }
        if (contentLinks) {
          await Promise.all(contentLinks.map((url) => {
            url = normalizeUrl(url)
            let hrefp = parseUrl(url, site.origin)
            return db('records_links').insert({
              record_rowid: rowid,
              source: 'content',
              href_origin: hrefp.origin,
              href_path: hrefp.path
            })
          }))
        }
        await Promise.all(dataEntries
          .filter(([key, value]) => value !== null && typeof value !== 'undefined')
          .map(([key, value]) => {
            if (key !== METADATA_KEYS.content && isUrlLike(value)) {
              value = normalizeUrl(value)
              let hrefp = parseUrl(value, site.origin)
              return Promise.all([
                db('records_links').insert({
                  record_rowid: rowid,
                  source: `metadata:${key}`,
                  href_origin: hrefp.origin,
                  href_path: hrefp.path
                }),
                db('records_data').insert({record_rowid: rowid, key, value})
              ])
            }
            return db('records_data').insert({record_rowid: rowid, key, value})
          })
        )
      }
    }
    DEBUGGING.setSiteState({
      url: site.origin,
      progress: undefined,
      last_indexed_version: site.current_version,
      last_indexed_ts: Date.now(),
      error: undefined
    })
    logger.debug(`Indexed ${origin} [ v${site.last_indexed_version} -> v${site.current_version} ]`)
    await updateIndexState(db, site)
    if (!site.is_indexed) {
      // indicate this site's index is now ready to be used
      await setSiteFlags(db, site, {is_indexed: true})
    }
  } catch (e) {
    DEBUGGING.setSiteState({
      url: origin,
      progress: undefined,
      last_indexed_version: current_version,
      last_indexed_ts: Date.now(),
      error: e.toString()
    })
    logger.debug(`Failed to index site ${origin}. ${e.toString()}`, {origin, error: e.toString()})
  } finally {
    DEBUGGING.removeTarget(origin)
    release()
  }
}

async function deindexSite (origin) {
  origin = normalizeOrigin(origin)
  DEBUGGING.moveToTargets(origin)
  var release = await lock(`beaker-indexer:${origin}`)
  try {
    let site = (await db('sites').select('rowid', 'origin').where({origin}))[0]
    if (!site) throw new Error(`Site not found in index`)
    let records = await db('records').select('rowid').where({site_rowid: site.rowid})
    for (let record of records) {
      await db('records_links').del().where({record_rowid: record.rowid})
      await db('records_data').del().where({record_rowid: record.rowid})
    }
    await db('records').del().where({site_rowid: site.rowid})
    await db('sites').update({
      last_indexed_version: 0,
      last_indexed_ts: 0,
      is_index_target: 0, // no longer an indexing target
      is_indexed: 0 // no longer indexed
    }).where({origin})
    logger.debug(`Deindexed ${site.origin}/*`, {origin: site.origin})
  } catch (e) {
    logger.debug(`Failed to de-index site ${origin}. ${e.toString()}`, {origin, error: e.toString()})
  } finally {
    DEBUGGING.removeTarget(origin)
    release()
  }
}

/**
 * @param {String} [url]
 * @param {Object} [etc]
 * @param {Boolean} [etc.includeLinks]
 * @param {Boolean} [etc.includeContent]
 * @returns {Promise<RecordDescription>}
 */
async function getLiveRecord (url, {includeLinks, includeContent} = {}) {
  let urlp = parseUrl(url)
  if (!urlp.origin.startsWith('hyper:')) {
    return undefined // hyper only for now
  }
  try {
    let site = await loadSite(db, urlp.origin)
    let stat = await site.stat(urlp.pathname)
    let update = {
      remove: false,
      path: urlp.pathname,
      metadata: stat.metadata,
      ctime: stat.ctime,
      mtime: stat.mtime
    }
    logger.silly(`Live-fetching ${url}`)
    var record = {
      type: 'file',
      path: urlp.pathname,
      url,
      ctime: +stat.ctime,
      mtime: +stat.mtime,
      rtime: Date.now(),
      metadata: stat.metadata,
      index: 'live',
      links: getMetadataLinks(stat.metadata, urlp.origin),
      content: undefined,
    }
    if ((includeLinks || includeContent) && record.path.endsWith('.md')) {
      record.content = await site.fetch(update.path)
      addContentLinks(record, urlp.origin)
    }
    return record
  } catch (e) {
    logger.debug(`Failed to live-fetch file ${url}. ${e.toString()}`, {origin: urlp.origin, error: e.toString()})
  }  
  return undefined
}

/**
 * @param {String} origin
 * @param {Object} [opts]
 * @param {String[]} [opts.paths]
 * @param {Object} [etc]
 * @param {Boolean} [etc.includeContent]
 * @param {Boolean} [etc.includeLinks]
 * @returns {Promise<RecordDescription[]>}
 */
async function listLiveRecords (origin, opts, {includeContent, includeLinks} = {}) {
  var records = []
  try {
    let site = await loadSite(db, origin)
    logger.silly(`Live-querying ${origin}`)
    let files = await site.listMatchingFiles(opts.paths)
    records = records.concat(files.map(file => {
      return {
        type: 'file',
        path: file.path,
        url: file.url,
        ctime: +file.stat.ctime,
        mtime: +file.stat.mtime,
        rtime: Date.now(),
        metadata: file.stat.metadata,
        index: 'live',
        links: getMetadataLinks(file.stat.metadata, origin),
        content: undefined,

        // helper to fetch the rest of the data if in the results set
        fetchData: async function () {
          if ((includeContent || includeLinks) && file.path.endsWith('.md')) {
            this.content = await site.fetch(file.path)
            addContentLinks(this, origin)
          }
        }
      }
    }))
  } catch (e) {
    logger.debug(`Failed to live-query site ${origin}. ${e.toString()}`, {origin, error: e.toString()})
  }  
  return records
}

function getMetadataLinks (metadata, origin) {
  var links = []
  for (let k in metadata) {
    metadata[k] = metadata[k]
    if (isUrlLike(metadata[k])) {
      try {
        let urlp = parseUrl(normalizeUrl(metadata[k]), origin)
        links.push({
          source: `metadata:${k}`,
          url: urlp.origin + urlp.path,
          origin: urlp.origin,
          path: urlp.path
        })
      } catch {}
    }
  }
  return links
}

function addContentLinks (record, origin) {
  for (let addedLink of markdownLinkExtractor(record.content)) {
    try {
      let hrefp = parseUrl(normalizeUrl(addedLink), origin)
      record.links.push({
        source: 'content',
        url: hrefp.origin + hrefp.path,
        origin: hrefp.origin,
        path: hrefp.path
      })
    } catch {}
  }
}

function toStringArray (v) {
  if (!v) return
  v = toArray(v).filter(item => typeof item === 'string')
  if (v.length === 0) return
  return v
}

function queryAstWants (ast, key) {
  return (key in graphqlFields(ast))
}