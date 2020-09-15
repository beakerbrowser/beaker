import { PermissionsError } from 'beaker-error-constants'
import { normalizeOrigin, normalizeUrl } from '../../lib/urls'
import { joinPath, parseSimplePathSpec } from '../../lib/strings'
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
 * @typedef {import('./const').RecordDescription} RecordDescription
 * @typedef {import('../filesystem/query').FSQueryResult} FSQueryResult
 * @typedef {import('./const').NotificationQuery} NotificationQuery
 * @typedef {import('../../lib/session-permissions').EnumeratedSessionPerm} EnumeratedSessionPerm
 */


// exported apis
// =

/**
 * @param {Object} db
 * @param {Object} opts
 * @param {String|String[]} [opts.origin]
 * @param {String|String[]} [opts.path]
 * @param {String} [opts.links]
 * @param {Boolean|NotificationQuery} [opts.notification]
 * @param {String|String[]} [opts.index] - 'local' or 'network'
 * @param {String} [opts.sort]
 * @param {Number} [opts.offset]
 * @param {Number} [opts.limit]
 * @param {Boolean} [opts.reverse]
 * @param {Object} [internal]
 * @param {Object} [internal.permissions]
 * @param {Number} [internal.notificationRtime]
 * @param {EnumeratedSessionPerm[]} [internal.permissions.query]
 * @returns {Promise<{records: RecordDescription[], missedOrigins: String[]}>}
 */
export async function query (db, opts, {permissions, notificationRtime} = {}) {
  var shouldExcludePrivate = checkShouldExcludePrivate(opts, permissions)

  var sep = `[>${Math.random()}<]`
  var query = db('sites')
    .innerJoin('records', 'sites.rowid', 'records.site_rowid')
    .leftJoin('records_data', function() {
      this.on('records.rowid', '=', 'records_data.record_rowid').onNotNull('records_data.value')
    })
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
      db.raw(`group_concat(records_data.value, '${sep}') as data_values`)
    )
    .groupBy('records.rowid')
    .offset(opts.offset)
    .orderBy(opts.sort, opts.reverse ? 'desc' : 'asc')
  if (typeof opts.limit === 'number') {
    query = query.limit(opts.limit)
  }

  if (opts.sort === 'crtime') {
    query = query.select(db.raw(`CASE rtime WHEN rtime < ctime THEN rtime ELSE ctime END AS crtime`))
  } else if (opts.sort === 'mrtime') {
    query = query.select(db.raw(`CASE rtime WHEN rtime < mtime THEN rtime ELSE mtime END AS mrtime`))
  }

  if (opts?.origin) {
    if (Array.isArray(opts.origin)) {
      let origins = opts.origin.map(origin => normalizeOrigin(origin))
      if (shouldExcludePrivate && origins.find(origin => origin === 'hyper://private')) {
        throw new PermissionsError()
      }
      query = query.whereIn('origin', origins)
    } else {
      let origin = normalizeOrigin(opts.origin)
      if (shouldExcludePrivate && origin === 'hyper://private') {
        throw new PermissionsError()
      }
      query = query.where({origin})
    }
  } else if (shouldExcludePrivate) {
    query = query.whereNot({origin: 'hyper://private'})
  }
  if (opts?.path) {
    if (Array.isArray(opts.path)) {
      query = query.where(function () {
        let chain = this.where(parseSimplePathSpec(opts.path[0]))
        for (let i = 1; i < opts.path.length; i++) {
          chain = chain.orWhere(parseSimplePathSpec(opts.path[i]))
        }
      })
    } else {
      query = query.where(parseSimplePathSpec(opts.path))
    }
  }
  if (typeof opts?.links === 'string') {
    query = query.joinRaw(
      `INNER JOIN records_data as link ON link.record_rowid = records.rowid AND link.value = ?`,
      [normalizeUrl(opts.links)]
    )
  }
  if (opts?.notification) {
    query = query
      .select(
        'notification_key',
        'notification_subject_origin',
        'notification_subject_path',
      )
      .innerJoin('records_notification', 'records.rowid', 'records_notification.record_rowid')
    if (opts.notification.unread) {
      query = query.whereRaw(`rtime > ?`, [notificationRtime])
    }
  }

  var indexStatesQuery
  if (opts?.origin && !opts?.links && !opts?.notification) {
    // fetch info on whether each given site has been indexed
    indexStatesQuery = db('sites')
      .select('origin')
      .where('last_indexed_version', '>', 0)
    if (Array.isArray(opts.origin)) {
      indexStatesQuery = indexStatesQuery.whereIn('origin', opts.origin.map(origin => normalizeOrigin(origin)))
    } else {
      indexStatesQuery = indexStatesQuery.where({origin: normalizeOrigin(opts.origin)})
    }
  }

  var [rows, indexStates] = await Promise.all([
    query,
    indexStatesQuery
  ])

  var records = rows.map(row => {
    var record = {
      url: row.origin + row.path,
      prefix: row.prefix,
      extension: row.extension,
      ctime: row.ctime,
      mtime: row.mtime,
      rtime: row.rtime,
      index: 'local',
      site: {
        url: row.origin,
        title: row.siteTitle
      },
      metadata: {},
      links: [],
      content: undefined,
      notification: undefined
    }
    var dataKeys = (row.data_keys || '').split(sep)
    var dataValues = (row.data_values || '').split(sep)
    for (let i = 0; i < dataKeys.length; i++) {
      let key = dataKeys[i]
      if (key === METADATA_KEYS.content) {
        record.content = dataValues[i]
      } else if (key === METADATA_KEYS.link) {
        record.links.push(dataValues[i])
      } else {
        record.metadata[key] = dataValues[i]
      }
    }
    if (opts?.notification) {
      record.notification = {
        key: row.notification_key,
        subject: joinPath(row.notification_subject_origin, row.notification_subject_path),
        unread: row.rtime > notificationRtime
      }
    }
    return record
  })

  // identify the origins not found in the index
  var missedOrigins
  if (indexStates) {
    missedOrigins = []
    for (let origin of toArray(opts.origin)) {
      origin = normalizeOrigin(origin)
      if (indexStates.find(state => state.origin === origin)) {
        continue
      }
      missedOrigins.push(origin)
    }
  }

  return {records, missedOrigins}
}

/**
 * @param {Object} db
 * @param {Object} [opts]
 * @param {String|Array<String>} [opts.origin]
 * @param {String|Array<String>} [opts.path]
 * @param {String} [opts.links]
 * @param {Boolean|NotificationQuery} [opts.notification]
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
    .groupBy('origin')

  if (opts?.origin) {
    if (Array.isArray(opts.origin)) {
      let origins = opts.origin.map(origin => normalizeOrigin(origin))
      if (shouldExcludePrivate && origins.find(origin => origin === 'hyper://private')) {
        throw new PermissionsError()
      }
      query = query.whereIn('origin', origins)
    } else {
      let origin = normalizeOrigin(opts.origin)
      if (shouldExcludePrivate && origin === 'hyper://private') {
        throw new PermissionsError()
      }
      query = query.where({origin})
    }
  } else if (shouldExcludePrivate) {
    query = query.whereNot({origin: 'hyper://private'})
  }
  if (opts?.path) {
    if (Array.isArray(opts.path)) {
      query = query.where(function () {
        let chain = this.where(parseSimplePathSpec(opts.path[0]))
        for (let i = 1; i < opts.path.length; i++) {
          chain = chain.orWhere(parseSimplePathSpec(opts.path[i]))
        }
      })
    } else {
      query = query.where(parseSimplePathSpec(opts.path))
    }
  }
  if (typeof opts?.links === 'string') {
    query = query.joinRaw(
      `INNER JOIN records_data as link ON link.record_rowid = records.rowid AND link.value = ?`,
      [normalizeUrl(opts.links)]
    )
  }
  if (opts?.notification) {
    query = query
      .innerJoin('records_notification', 'records.rowid', 'records_notification.record_rowid')
    if (opts.notification?.unread) {
      query = query.whereRaw(`records.rtime > ?`, [notificationRtime])
    }
  }

  var indexStatesQuery
  if (opts?.origin && !opts?.links && !opts?.notification) {
    // fetch info on whether each given site has been indexed
    indexStatesQuery = db('sites')
      .select('origin')
      .where('last_indexed_version', '>', 0)
    if (Array.isArray(opts.origin)) {
      indexStatesQuery = indexStatesQuery.whereIn('origin', opts.origin.map(origin => normalizeOrigin(origin)))
    } else {
      indexStatesQuery = indexStatesQuery.where({origin: normalizeOrigin(opts.origin)})
    }
  }

  var [rows, indexStates] = await Promise.all([
    query,
    indexStatesQuery
  ])

  var count = rows.reduce((acc, row) => acc + row.count, 0)
  var includedOrigins = rows.map(row => row.origin)

  // identify the origins not found in the index
  var missedOrigins
  if (indexStates) {
    missedOrigins = []
    for (let origin of toArray(opts.origin)) {
      origin = normalizeOrigin(origin)
      if (indexStates.find(state => state.origin === origin)) {
        continue
      }
      missedOrigins.push(origin)
    }
  }

  return {count, includedOrigins, missedOrigins}
}