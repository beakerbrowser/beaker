import { app, ipcMain } from 'electron'
import sqlite3 from 'sqlite3'
import path from 'path'
import url from 'url'
import zerr from 'zerr'
import multicb from 'multicb'
import rpc from 'pauls-electron-rpc'
import FnQueue from 'function-queue'
import manifest from '../api-manifests/history'
import { cbPromise } from '../../lib/functions'
import { setupDatabase2 } from '../../lib/bg/sqlite-tools'
import log from '../../log'

const BadParam = zerr('BadParam', '% must be a %')
const InvalidCmd = zerr('InvalidCommand', '% is not a valid command')

// globals
// =
var db
var migrations
var setupPromise
var addVisitQueue = FnQueue()

// exported methods
// =

export function setup () {
  // open database
  var dbPath = path.join(app.getPath('userData'), 'History')
  db = new sqlite3.Database(dbPath)
  setupPromise = setupDatabase2(db, migrations, '[HISTORY]')

  // wire up RPC
  rpc.exportAPI('beakerHistory', manifest, { addVisit, getVisitHistory, getMostVisited, search, removeVisit, removeAllVisits })
}

export function addVisit ({url, title}) {
  return setupPromise.then(v => cbPromise(cb => {
    // validate parameters
    cb = cb || (()=>{})
    if (!url || typeof url != 'string')
      return cb(new BadParam('url', 'string'))
    if (!title || typeof title != 'string')
      return cb(new BadParam('title', 'string'))

    // get current stats
    addVisitQueue.push(endTransaction => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION;')
        db.get('SELECT * FROM visit_stats WHERE url = ?;', [url], (err, stats) => {
          if (err)
            return cb(err)

          var done = multicb()
          var ts = Date.now()
          db.serialize(() => {
            // log visit
            db.run('INSERT INTO visits (url, title, ts) VALUES (?, ?, ?);', [url, title, ts], done())
            // first visit?
            if (!stats) {
              // yes, create new stat and search entries
              db.run('INSERT INTO visit_stats (url, num_visits, last_visit_ts) VALUES (?, ?, ?);', [url, 1, ts], done())
              db.run('INSERT INTO visit_fts (url, title) VALUES (?, ?);', [url, title], done())
            } else {
              // no, update stats
              var num_visits = (+stats.num_visits||1) + 1
              db.run('UPDATE visit_stats SET num_visits = ?, last_visit_ts = ? WHERE url = ?;', [num_visits, ts, url], done())
            }
            db.run('COMMIT;', done())
          })
          done(err => {
            endTransaction()
            cb(err)
          })          
        })
      })
    })
  }))
}

export function getVisitHistory ({ offset, limit }) {
  return setupPromise.then(v => cbPromise(cb => {
    offset = offset || 0
    limit = limit || 50
    db.all('SELECT * FROM visits ORDER BY rowid DESC LIMIT ? OFFSET ?', [limit, offset], cb)
  }))
}

export function getMostVisited ({ offset, limit }) {
  return setupPromise.then(v => cbPromise(cb => {
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
  }))
}

export function search (q) {
  return setupPromise.then(v => cbPromise(cb => {
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
  }))
}

export function removeVisit (url) {
  return setupPromise.then(v => cbPromise(cb => {
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
  }))
}

export function removeAllVisits () {
  return setupPromise.then(v => cbPromise(cb => {
    cb = cb || (()=>{})
    db.run(`
      BEGIN TRANSACTION;
      DELETE FROM visits;
      DELETE FROM visit_stats;
      DELETE FROM visit_fts;
      COMMIT;
    `, cb)
  }))
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