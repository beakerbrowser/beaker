import lock from '../../lib/lock'
import * as db from './profile-data-db'

// typedefs
// =

class BadParamError extends Error {
  /**
   * @param {string} msg
   */
  constructor (msg) {
    super()
    this.name = 'BadParamError'
    this.message = msg
  }
}

/**
 * @typedef {Object} Visit
 * @prop {number} profileId
 * @prop {string} url
 * @prop {string} title
 * @prop {number} ts
 *
 * @typedef {Object} VisitSearchResult
 * @prop {string} offsets
 * @prop {string} url
 * @prop {string} title
 * @prop {number} num_visits
 */

// exported methods
// =

/**
 * @param {number} profileId
 * @param {Object} values
 * @param {string} values.url
 * @param {string} values.title
 * @returns {Promise<void>}
 */
export const addVisit = async function (profileId, {url, title}) {
  // validate parameters
  if (!url || typeof url !== 'string') {
    throw new BadParamError('url must be a string')
  }
  if (!title || typeof title !== 'string') {
    throw new BadParamError('title must be a string')
  }

  var release = await lock('history-db')
  try {
    await db.run('BEGIN TRANSACTION;')

    var ts = Date.now()
    if (!url.startsWith('beaker://')) { // dont log stats on internal sites, keep them out of the search
      // get current stats
      var stats = await db.get('SELECT * FROM visit_stats WHERE url = ?;', [url])

      // create or update stats
      if (!stats) {
        await db.run('INSERT INTO visit_stats (url, num_visits, last_visit_ts) VALUES (?, ?, ?);', [url, 1, ts])
        await db.run('INSERT INTO visit_fts (url, title) VALUES (?, ?);', [url, title])
      } else {
        let num_visits = (+stats.num_visits || 1) + 1
        await db.run('UPDATE visit_stats SET num_visits = ?, last_visit_ts = ? WHERE url = ?;', [num_visits, ts, url])
      }
    }

    // visited within 1 hour?
    var visit = await db.get('SELECT rowid, * from visits WHERE profileId = ? AND url = ? AND ts > ? ORDER BY ts DESC LIMIT 1', [profileId, url, ts - 1000 * 60 * 60])
    if (visit) {
      // update visit ts and title
      await db.run('UPDATE visits SET ts = ?, title = ? WHERE rowid = ?', [ts, title, visit.rowid])
    } else {
      // log visit
      await db.run('INSERT INTO visits (profileId, url, title, ts) VALUES (?, ?, ?, ?);', [profileId, url, title, ts])
    }

    await db.run('COMMIT;')
  } finally {
    release()
  }
}

/**
 * @param {number} profileId
 * @param {Object} opts
 * @param {string} [opts.search]
 * @param {number} [opts.offset]
 * @param {number} [opts.limit]
 * @param {number} [opts.before]
 * @param {number} [opts.after]
 * @returns {Promise<Array<Visit>>}
 */
export const getVisitHistory = async function (profileId, {search, offset, limit, before, after}) {
  var release = await lock('history-db')
  try {
    const params = /** @type Array<string | number> */([
      profileId,
      limit || 50,
      offset || 0
    ])
    if (search) {
      // prep search terms
      params.push(
        search
          .toLowerCase() // all lowercase. (uppercase is interpretted as a directive by sqlite.)
          .replace(/[:^*]/g, '') + // strip symbols that sqlite interprets.
          '*' // allow partial matches
      )
      return await db.all(`
        SELECT visits.*
          FROM visit_fts
            LEFT JOIN visits ON visits.url = visit_fts.url
          WHERE visits.profileId = ?1 AND visit_fts MATCH ?4
          ORDER BY visits.ts DESC
          LIMIT ?2 OFFSET ?3
      `, params)
    }
    let timeWhere = ''
    if (before && after) {
      timeWhere += 'AND ts <= ?4 AND ts >= ?5'
      params.push(before)
      params.push(after)
    } else if (before) {
      timeWhere += 'AND ts <= ?4'
      params.push(before)
    } else if (after) {
      timeWhere += 'AND ts >= ?4'
      params.push(after)
    }
    return await db.all(`
      SELECT * FROM visits
        WHERE profileId = ?1 ${timeWhere}
        ORDER BY ts DESC
        LIMIT ?2 OFFSET ?3
    `, params)
  } finally {
    release()
  }
}

/**
 * @param {number} profileId
 * @param {Object} opts
 * @param {number} [opts.offset]
 * @param {number} [opts.limit]
 * @returns {Promise<Array<Visit>>}
 */
export const getMostVisited = async function (profileId, { offset, limit }) {
  var release = await lock('history-db')
  try {
    offset = offset || 0
    limit = limit || 50
    return await db.all(`
      SELECT visit_stats.*, visits.title AS title
        FROM visit_stats
          LEFT JOIN visits ON visits.url = visit_stats.url
        WHERE profileId = ? AND visit_stats.num_visits > 5
        GROUP BY visit_stats.url
        ORDER BY num_visits DESC, last_visit_ts DESC
        LIMIT ? OFFSET ?
    `, [profileId, limit, offset])
  } finally {
    release()
  }
}

/**
 * @param {string} q
 * @returns {Promise<Array<VisitSearchResult>>}
 */
export const search = async function (q) {
  if (!q || typeof q !== 'string') {
    throw new BadParamError('q must be a string')
  }

  var release = await lock('history-db')
  try {
    // prep search terms
    q = q
      .toLowerCase() // all lowercase. (uppercase is interpretted as a directive by sqlite.)
      .replace(/[:^*]/g, '') // strip symbols that sqlite interprets
      .replace(/[-]/g, ' ') + // strip symbols that sqlite interprets
      '*' // allow partial matches

    // run query
    return await db.all(`
      SELECT offsets(visit_fts) as offsets, visit_fts.url, visit_fts.title, visit_stats.num_visits
        FROM visit_fts
        LEFT JOIN visit_stats ON visit_stats.url = visit_fts.url
        WHERE visit_fts MATCH ? AND visit_stats.num_visits > 2
        ORDER BY visit_stats.num_visits DESC
        LIMIT 10;
    `, [q])
  } finally {
    release()
  }
}

/**
 * @param {string} url
 * @returns {Promise<void>}
 */
export const removeVisit = async function (url) {
  // validate parameters
  if (!url || typeof url !== 'string') {
    throw new BadParamError('url must be a string')
  }

  var release = await lock('history-db')
  try {
    db.serialize()
    db.run('BEGIN TRANSACTION;')
    db.run('DELETE FROM visits WHERE url = ?;', url)
    db.run('DELETE FROM visit_stats WHERE url = ?;', url)
    db.run('DELETE FROM visit_fts WHERE url = ?;', url)
    await db.run('COMMIT;')
  } finally {
    db.parallelize()
    release()
  }
}

/**
 * @param {number} timestamp
 * @returns {Promise<void>}
 */
export const removeVisitsAfter = async function (timestamp) {
  var release = await lock('history-db')
  try {
    db.serialize()
    db.run('BEGIN TRANSACTION;')
    db.run('DELETE FROM visits WHERE ts >= ?;', timestamp)
    db.run('DELETE FROM visit_stats WHERE last_visit_ts >= ?;', timestamp)
    await db.run('COMMIT;')
  } finally {
    db.parallelize()
    release()
  }
}

/**
 * @returns {Promise<void>}
 */
export const removeAllVisits = async function () {
  var release = await lock('history-db')
  db.run('DELETE FROM visits;')
  db.run('DELETE FROM visit_stats;')
  db.run('DELETE FROM visit_fts;')
  release()
}
