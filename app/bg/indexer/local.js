import { PermissionsError } from 'beaker-error-constants'
import { normalizeOrigin, normalizeUrl, isUrlLike } from '../../lib/urls'
import { joinPath, parseSimplePathSpec, toNiceUrl } from '../../lib/strings'
import {
  toArray,
  checkShouldExcludePrivate
} from './util'
import { METADATA_KEYS } from './const'

/**
 * @typedef {import('./const').Site} Site
 * @typedef {import('./const').SiteDescription} SiteDescription
 * @typedef {import('./const').RecordUpdate} RecordUpdate
 * @typedef {import('./const').ParsedUrl} ParsedUrl
 * @typedef {import('./const').RangeQuery} RangeQuery
 * @typedef {import('./const').LinkQuery} LinkQuery
 * @typedef {import('./const').RecordDescription} RecordDescription
 * @typedef {import('../filesystem/query').FSQueryResult} FSQueryResult
 * @typedef {import('../../lib/session-permissions').EnumeratedSessionPerm} EnumeratedSessionPerm
 */


// exported apis
// =

/**
 * @param {Object} db
 * @param {Object} [opts]
 * @param {String} [opts.search]
 * @param {String|String[]} [opts.index] - 'local', 'network', url of a specific hyperbee index
 * @param {Boolean} [opts.writable]
 * @param {Number} [opts.offset]
 * @param {Number} [opts.limit]
 * @returns {Promise<SiteDescription[]>}
 */
export async function listSites (db, opts) {
  var query = db('sites')
    .select('*')
    .offset(opts?.offset || 0)
  if (typeof opts?.limit === 'number') {
    query = query.limit(opts.limit)
  }
  if (opts?.search) {
    query = query.whereRaw(
      `sites.title LIKE ? OR sites.description LIKE ?`,
      [`%${opts.search}%`, `%${opts.search}%`]
    )
  }
  if (typeof opts?.writable === 'boolean') {
    query = query.where('sites.writable', opts.writable ? 1 : 0)
  }
  var siteRows = await query
  return siteRows.map(row => ({
    origin: row.origin,
    url: row.origin,
    title: row.title || toNiceUrl(row.origin),
    description: row.description,
    writable: Boolean(row.writable),
    index: {id: 'local'},
    graph: undefined
  }))
}

/**
 * @param {Object} db
 * @param {Object} opts
 * @param {String[]} [opts.origins]
 * @param {String[]} [opts.excludeOrigins]
 * @param {String[]} [opts.paths]
 * @param {LinkQuery} [opts.links]
 * @param {RangeQuery} [opts.before]
 * @param {RangeQuery} [opts.after]
 * @param {String} [opts.sort]
 * @param {Number} [opts.offset]
 * @param {Number} [opts.limit]
 * @param {Boolean} [opts.reverse]
 * @param {Object} [internal]
 * @param {Object} [internal.permissions]
 * @param {EnumeratedSessionPerm[]} [internal.permissions.query]
 * @returns {Promise<{records: RecordDescription[], missedOrigins: String[]}>}
 */
export async function query (db, opts, {permissions} = {}) {
  var shouldExcludePrivate = checkShouldExcludePrivate(opts, permissions)

  var sep = `[>${(Math.random()*100)|0}<]`
  var query = db('sites')
    .innerJoin('records', 'sites.rowid', 'records.site_rowid')
    .leftJoin('records_data', function() {
      this.on('records.rowid', '=', 'records_data.record_rowid').onNotNull('records_data.value')
    })
    .leftJoin('records_links', 'records.rowid', 'records_links.record_rowid')
    .select(
      'origin',
      'path',
      'prefix',
      'extension',
      'ctime',
      'mtime',
      'rtime',
      'title as siteTitle',
      db.raw(`group_concat(records_data.key, '${sep}') as data_keys`),
      db.raw(`group_concat(records_data.value, '${sep}') as data_values`),
      db.raw(`group_concat(records_links.href_origin, '${sep}') as links_href_origins`),
      db.raw(`group_concat(records_links.href_path, '${sep}') as links_href_paths`),
      db.raw(`group_concat(records_links.source, '${sep}') as links_sources`)
    )
    .where({is_indexed: 1})
    .groupBy('records.rowid')
    .offset(opts.offset)
    .orderBy(opts.sort, opts.reverse ? 'desc' : 'asc')
  if (typeof opts.limit === 'number') {
    query = query.limit(opts.limit)
  }

  if (opts.sort === 'crtime' || opts.before?.key === 'crtime' || opts.after?.key === 'crtime') {
    query = query.select(db.raw(`CASE rtime WHEN rtime < ctime THEN rtime ELSE ctime END AS crtime`))
  } 
  if (opts.sort === 'mrtime' || opts.before?.key === 'mrtime' || opts.after?.key === 'mrtime') {
    query = query.select(db.raw(`CASE rtime WHEN rtime < mtime THEN rtime ELSE mtime END AS mrtime`))
  }

  if (opts.origins) {
    if (shouldExcludePrivate && opts.origins.find(origin => origin === 'hyper://private')) {
      throw new PermissionsError()
    }
    query = query.whereIn('origin', opts.origins)
  } else {
    if (shouldExcludePrivate) {
      query = query.whereNot({origin: 'hyper://private'})
    }
    query = query.whereRaw(`sites.is_index_target = ?`, [1])
  }
  if (opts.excludeOrigins) {
    query = query.whereNotIn('origin', opts.excludeOrigins)
  }
  if (opts.paths) {
    query = query.where(function () {
      let chain = this.where(parseSimplePathSpec(opts.paths[0]))
      for (let i = 1; i < opts.paths.length; i++) {
        chain = chain.orWhere(parseSimplePathSpec(opts.paths[i]))
      }
    })
  }
  if (opts.links) {
    if (opts.links.origin) {
      query = query.where('records_links.href_origin', opts.links.origin)
    }
    if (opts.links.paths) {
      if (opts.links.paths.every(str => !str.includes('*'))) {
        query = query.whereIn('records_links.href_path', opts.links.paths)
      } else {
        query = query.where(function () {
          let chain = this.whereRaw(`records_links.href_path GLOB ?`, [opts.links.paths[0]])
          for (let i = 1; i < opts.links.paths.length; i++) {
            chain = chain.orWhereRaw(`records_links.href_path GLOB ?`, [opts.links.paths[i]])
          }
        })
      }
    }
  }
  if (opts.before) {
    query = query.where(opts.before.key, opts.before.inclusive ? '<=' : '<', opts.before.value)
  }
  if (opts.after) {
    query = query.where(opts.after.key, opts.after.inclusive ? '>=' : '>', opts.after.value)
  }

  var sitesQuery
  if (opts.origins) {
    // fetch info on whether each given site has been indexed
    sitesQuery = db('sites').select('origin').where({is_indexed: 1}).whereIn('origin', opts.origins)
  }

  var [rows, siteStates] = await Promise.all([
    query,
    sitesQuery
  ])

  var records = rows.map(row => {
    var record = {
      type: 'file',
      path: row.path,
      url: row.origin + row.path,
      ctime: row.ctime,
      mtime: row.mtime,
      rtime: row.rtime,
      metadata: {},
      links: [],
      content: undefined,
      index: 'local'
    }
    if (!!row.data_keys) {
      var dataKeys = (row.data_keys || '').split(sep)
      var dataValues = (row.data_values || '').split(sep)
      for (let i = 0; i < dataKeys.length; i++) {
        let key = dataKeys[i]
        if (key === METADATA_KEYS.content) {
          record.content = dataValues[i]
        } else {
          record.metadata[key] = dataValues[i]
        }
      }
    }
    if (!!row.links_sources) {
      var linkOrigins = (row.links_href_origins || '').split(sep)
      var linkPaths = (row.links_href_paths || '').split(sep)
      var linkSources = (row.links_sources || '').split(sep)
      for (let i = 0; i < linkOrigins.length; i++) {
        let link = {
          source: linkSources[i],
          url: linkOrigins[i] + linkPaths[i],
          origin: linkOrigins[i],
          path: linkPaths[i]
        }
        // the aggregation will get duplicates so we have to dedup here
        if (!record.links.find(l2 => l2.source === link.source && l2.url === link.url)) {
          record.links.push(link)
        }
      }
    }
    return record
  })

  var missedOrigins
  if (siteStates) {
    // siteStates is a list of sites that are indexed
    // set-diff the desired origins against it
    missedOrigins = []
    for (let origin of opts.origins) {
      if (!siteStates.find(state => state.origin === origin)) {
        missedOrigins.push(origin)
      }
    }
  }

  return {records, missedOrigins}
}

/**
 * @param {Object} db
 * @param {Object} [opts]
 * @param {String[]} [opts.origins]
 * @param {String[]} [opts.excludeOrigins]
 * @param {String[]} [opts.paths]
 * @param {LinkQuery} [opts.links]
 * @param {RangeQuery} [opts.before]
 * @param {RangeQuery} [opts.after]
 * @param {Object} [internal]
 * @param {Object} [internal.permissions]
 * @param {Number} [internal.notificationRtime]
 * @param {EnumeratedSessionPerm[]} [permissions.query]
 * @returns {Promise<{count: Number, includedOrigins: String[], missedOrigins: String[]}>}
 */
export async function count (db, opts, {permissions, notificationRtime} = {}) {
  var shouldExcludePrivate = checkShouldExcludePrivate(opts, permissions)

  var query = db('records')
    .innerJoin('sites', 'sites.rowid', 'records.site_rowid')
    .select(
      'origin',
      db.raw(`count(records.rowid) as count`)
    )
    .where({'sites.is_indexed': 1})
    .groupBy('origin')

  if (opts.before?.key === 'crtime' || opts.after?.key === 'crtime') {
    query = query.select(db.raw(`CASE rtime WHEN rtime < ctime THEN rtime ELSE ctime END AS crtime`))
  } 
  if (opts.before?.key === 'mrtime' || opts.after?.key === 'mrtime') {
    query = query.select(db.raw(`CASE rtime WHEN rtime < mtime THEN rtime ELSE mtime END AS mrtime`))
  }

  if (opts.origins) {
    if (shouldExcludePrivate && opts.origins.find(origin => origin === 'hyper://private')) {
      throw new PermissionsError()
    }
    query = query.whereIn('origin', opts.origins)
  } else {
    if (shouldExcludePrivate) {
      query = query.whereNot({origin: 'hyper://private'})
    }
    query = query.whereRaw(`sites.is_index_target = ?`, [1])
  }
  if (opts.excludeOrigins) {
    query = query.whereNotIn('origin', opts.excludeOrigins)
  }
  if (opts.paths) {
    query = query.where(function () {
      let chain = this.where(parseSimplePathSpec(opts.paths[0]))
      for (let i = 1; i < opts.paths.length; i++) {
        chain = chain.orWhere(parseSimplePathSpec(opts.paths[i]))
      }
    })
  }
  if (opts.links) {
    query = query.leftJoin('records_links', 'records.rowid', 'records_links.record_rowid')
    if (opts.links.origin) {
      query = query.where('records_links.href_origin', opts.links.origin)
    }
    if (opts.links.paths) {
      if (opts.links.paths.every(str => !str.includes('*'))) {
        query = query.whereIn('records_links.href_path', opts.links.paths)
      } else {
        query = query.where(function () {
          let chain = this.whereRaw(`records_links.href_path GLOB ?`, [opts.links.paths[0]])
          for (let i = 1; i < opts.links.paths.length; i++) {
            chain = chain.orWhereRaw(`records_links.href_path GLOB ?`, [opts.links.paths[i]])
          }
        })
      }
    }
  }
  if (opts.before) {
    query = query.where(opts.before.key, opts.before.inclusive ? '<=' : '<', opts.before.value)
  }
  if (opts.after) {
    query = query.where(opts.after.key, opts.after.inclusive ? '>=' : '>', opts.after.value)
  }

  var sitesQuery
  if (opts.origins) {
    // fetch info on whether each given site has been indexed
    sitesQuery = db('sites').select('origin').where({is_indexed: 1}).whereIn('origin', opts.origins.map(origin => normalizeOrigin(origin)))
  }

  var [rows, siteStates] = await Promise.all([
    query,
    sitesQuery
  ])

  var count = rows.reduce((acc, row) => acc + row.count, 0)
  var includedOrigins = rows.map(row => row.origin)
  
  var missedOrigins
  if (siteStates) {
    // siteStates is a list of sites that are indexed
    // set-diff the desired origins against it
    missedOrigins = []
    for (let origin of opts.origins) {
      if (!siteStates.find(state => state.origin === origin)) {
        missedOrigins.push(origin)
      }
    }
  }

  return {count, includedOrigins, missedOrigins}
}