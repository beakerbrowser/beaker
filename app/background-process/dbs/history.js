import { app, ipcMain } from 'electron'
import sqlite3 from 'sqlite3'
import path from 'path'
import url from 'url'
import zerr from 'zerr'
import multicb from 'multicb'
import rpc from 'pauls-electron-rpc'
import manifest from '../api-manifests/internal/history'
import { cbPromise } from '../../lib/functions'
import { setupSqliteDB, makeSqliteTransactor } from '../../lib/bg/db'
import { internalOnly } from '../../lib/bg/rpc'

const BadParam = zerr('BadParam', '% must be a %')
const InvalidCmd = zerr('InvalidCommand', '% is not a valid command')

// globals
// =
var db
var migrations
var setupPromise
var tx

// exported methods
// =

export function setup () {
  // open database
  var dbPath = path.join(app.getPath('userData'), 'History')
  db = new sqlite3.Database(dbPath)
  db.serialize()
  setupPromise = setupSqliteDB(db, migrations, '[HISTORY]')
  tx = makeSqliteTransactor(setupPromise)

  // wire up RPC
  rpc.exportAPI('beakerHistory', manifest, { addVisit, getVisitHistory, getMostVisited, search, removeVisit, removeAllVisits, removeVisitsAfter }, internalOnly)
}

export function addVisit ({url, title}) {
  return tx(cb => {
    // validate parameters
    cb = cb || (()=>{})
    if (!url || typeof url != 'string')
      return cb(new BadParam('url', 'string'))
    if (!title || typeof title != 'string')
      return cb(new BadParam('title', 'string'))

    // get current stats
    db.run('BEGIN TRANSACTION;')
    db.get('SELECT * FROM visit_stats WHERE url = ?;', [url], (err, stats) => {
      if (err) return cb(err)

      var done = multicb()
      var ts = Date.now()

      // visited within 1 hour?
      db.get('SELECT rowid, * from visits WHERE url = ? AND ts > ? ORDER BY ts DESC LIMIT 1', [url, ts - 1000 * 60 * 60], (err, visit) => {
        if (err) return cb(err)

        if (!stats) {
          // yes, create new stat and search entries
          db.run('INSERT INTO visit_stats (url, num_visits, last_visit_ts) VALUES (?, ?, ?);', [url, 1, ts], done())
          db.run('INSERT INTO visit_fts (url, title) VALUES (?, ?);', [url, title], done())
        } else {
          // no, update stats
          var num_visits = (+stats.num_visits||1) + 1
          db.run('UPDATE visit_stats SET num_visits = ?, last_visit_ts = ? WHERE url = ?;', [num_visits, ts, url], done())
        }

        if (visit) {
          // update visit ts and title
          db.run('UPDATE visits SET ts = ?, title = ? WHERE rowid = ?', [ts, title, visit.rowid], done())
        } else {
          // log visit
          db.run('INSERT INTO visits (url, title, ts) VALUES (?, ?, ?);', [url, title, ts], done())
        }
        db.run('COMMIT;', done())
        done(cb)
      })
    })
  })
}

export function getVisitHistory ({ offset, limit }) {
  return tx(cb => {
    offset = offset || 0
    limit = limit || 50
    db.all('SELECT * FROM visits ORDER BY ts DESC LIMIT ? OFFSET ?', [limit, offset], cb)
  })
}

export function getMostVisited ({ offset, limit }) {
  return tx(cb => {
    offset = offset || 0
    limit = limit || 50
    db.all(`
      SELECT visit_stats.*, visits.title AS title
        FROM visit_stats
          LEFT JOIN visits ON visits.url = visit_stats.url
        WHERE visit_stats.num_visits > 5
        GROUP BY visit_stats.url
        ORDER BY num_visits DESC, last_visit_ts DESC
        LIMIT ? OFFSET ?
    `, [limit, offset], cb)
  })
}

export function search (q) {
  return tx(cb => {
    if (!q || typeof q != 'string')
      return cb(new BadParam('q', 'string'))

    // prep search terms
    q = q
      .toLowerCase() // all lowercase. (uppercase is interpretted as a directive by sqlite.)
      .replace(/[:^*]/g, '') // strip symbols that sqlite interprets.
      + '*' // allow partial matches

    // run query
    db.all(`
      SELECT offsets(visit_fts) as offsets, visit_fts.url, visit_fts.title, visit_stats.num_visits
        FROM visit_fts
        LEFT JOIN visit_stats ON visit_stats.url = visit_fts.url
        WHERE visit_fts MATCH ?
        ORDER BY visit_stats.num_visits DESC
        LIMIT 10;
    `, [q], cb)
  })
}

export function removeVisit (url) {
  return tx(cb => {
    // validate parameters
    cb = cb || (()=>{})
    if (!url || typeof url != 'string')
      return cb(new BadParam('url', 'string'))

    db.serialize(() => {
      db.run('BEGIN TRANSACTION;')
      db.run('DELETE FROM visits WHERE url = ?;', url)
      db.run('DELETE FROM visit_stats WHERE url = ?;', url)
      db.run('DELETE FROM visit_fts WHERE url = ?;', url)
      db.run('COMMIT;', cb)
    })
  })
}

export function removeVisitsAfter (timestamp) {
  return tx(cb => {
    cb = cb || (()=>{})

    db.run('BEGIN TRANSACTION;')
    db.run('DELETE FROM visits WHERE ts >= ?;', timestamp)
    db.run('DELETE FROM visit_stats WHERE last_visit_ts >= ?;', timestamp)
    db.run('COMMIT;', cb)
  })
}

export function removeAllVisits () {
  return tx(cb => {
    cb = cb || (()=>{})

    db.run('DELETE FROM visits;')
    db.run('DELETE FROM visit_stats;')
    db.run('DELETE FROM visit_fts;')
  })
}

// internal methods
// =

migrations = [
  // version 1
  function (cb) {
    db.exec(`
      CREATE TABLE visits(
        url NOT NULL,
        title NOT NULL,
        ts NOT NULL
      );
      CREATE TABLE visit_stats(
        url NOT NULL,
        num_visits,
        last_visit_ts
      );
      CREATE VIRTUAL TABLE visit_fts USING fts4(
        url,
        title
      );
      CREATE UNIQUE INDEX visits_stats_url ON visit_stats (url);
      PRAGMA user_version = 1;
    `, cb)
  }
]
