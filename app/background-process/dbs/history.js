import zerr from 'zerr'
import lock from '../../lib/lock'
import * as db from './profile-data-db'

const BadParam = zerr('BadParam', '% must be a %')

// exported methods
// =

export async function addVisit (profileId, {url, title}) {
  // validate parameters
  if (!url || typeof url !== 'string') {
    throw new BadParam('url', 'string')
  }
  if (!title || typeof title !== 'string') {
    throw new BadParam('title', 'string')
  }

  var release = await lock('history-db')
  try {
    await db.run('BEGIN TRANSACTION;')

    // get current stats
    var stats = await db.get('SELECT * FROM visit_stats WHERE url = ?;', [url])
    var ts = Date.now()

    // create or update stats
    if (!stats) {
      await db.run('INSERT INTO visit_stats (url, num_visits, last_visit_ts) VALUES (?, ?, ?);', [url, 1, ts])
      await db.run('INSERT INTO visit_fts (url, title) VALUES (?, ?);', [url, title])
    } else {
      let num_visits = (+stats.num_visits || 1) + 1
      await db.run('UPDATE visit_stats SET num_visits = ?, last_visit_ts = ? WHERE url = ?;', [num_visits, ts, url])
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

export async function getVisitHistory (profileId, { offset, limit }) {
  var release = await lock('history-db')
  try {
    offset = offset || 0
    limit = limit || 50
    return await db.all('SELECT * FROM visits WHERE profileId = ? ORDER BY ts DESC LIMIT ? OFFSET ?', [profileId, limit, offset])
  } finally {
    release()
  }
}

export async function getMostVisited (profileId, { offset, limit }) {
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

export async function search (q) {
  if (!q || typeof q !== 'string') {
    throw new BadParam('q', 'string')
  }

  var release = await lock('history-db')
  try {
    // prep search terms
    q = q
      .toLowerCase() // all lowercase. (uppercase is interpretted as a directive by sqlite.)
      .replace(/[:^*]/g, '') + // strip symbols that sqlite interprets.
      '*' // allow partial matches

    // run query
    return await db.all(`
      SELECT offsets(visit_fts) as offsets, visit_fts.url, visit_fts.title, visit_stats.num_visits
        FROM visit_fts
        LEFT JOIN visit_stats ON visit_stats.url = visit_fts.url
        WHERE visit_fts MATCH ?
        ORDER BY visit_stats.num_visits DESC
        LIMIT 10;
    `, [q])
  } finally {
    release()
  }
}

export async function removeVisit (url) {
  // validate parameters
  if (!url || typeof url !== 'string') {
    throw new BadParam('url', 'string')
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

export async function removeVisitsAfter (timestamp) {
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

export async function removeAllVisits () {
  var release = await lock('history-db')
  db.run('DELETE FROM visits;')
  db.run('DELETE FROM visit_stats;')
  db.run('DELETE FROM visit_fts;')
  release()
}
