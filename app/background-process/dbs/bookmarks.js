import { app } from 'electron'
import sqlite3 from 'sqlite3'
import path from 'path'
import url from 'url'
import rpc from 'pauls-electron-rpc'
import manifest from '../api-manifests/internal/bookmarks'
import { cbPromise } from '../../lib/functions'
import { internalOnly } from '../../lib/bg/rpc'
import { setupSqliteDB } from '../../lib/bg/db'

// globals
// =
var db
var migrations
var setupPromise

// exported methods
// =

export function setup () {
  // open database
  var dbPath = path.join(app.getPath('userData'), 'Bookmarks')
  db = new sqlite3.Database(dbPath)
  setupPromise = setupSqliteDB(db, migrations, '[BOOKMARKS]')

  // wire up RPC
  rpc.exportAPI('beakerBookmarks', manifest, { add, changeTitle, changeUrl, addVisit, remove, get, list, listPinned, togglePinned }, internalOnly)
}

export function add (url, title, pinned) {
  return setupPromise.then(v => cbPromise(cb => {
    db.run(`
      INSERT OR REPLACE
        INTO bookmarks (url, title, num_visits, pinned)
        VALUES (?, ?, 0, ?)
    `, [url, title, pinned], cb)
  }))
}

export function changeTitle (url, title) {
  return setupPromise.then(v => cbPromise(cb => {
    db.run(`UPDATE bookmarks SET title = ? WHERE url = ?`, [title, url], cb)
  }))
}

export function changeUrl (oldUrl, newUrl) {
  return setupPromise.then(v => cbPromise(cb => {
    db.run(`UPDATE bookmarks SET url = ? WHERE url = ?`, [newUrl, oldUrl], cb)
  }))
}

export function togglePinned (url, pinned) {
  return setupPromise.then(v => cbPromise(cb => {
    db.run(`UPDATE bookmarks SET pinned = ? WHERE url = ?`, [!pinned ? 1 : 0, url], cb)
  }))
}

export function addVisit (url) {
  return setupPromise.then(v => cbPromise(cb => {
    db.run(`UPDATE bookmarks SET num_visits = num_visits + 1 WHERE url = ?`, url, cb)
  }))
}

export function remove (url) {
  return setupPromise.then(v => cbPromise(cb => {
    db.run(`DELETE FROM bookmarks WHERE url = ?`, [url], cb)
  }))
}

export function get (url) {
  return setupPromise.then(v => cbPromise(cb => {
    db.get(`SELECT url, title FROM bookmarks WHERE url = ?`, [url], cb)
  }))
}

export function listPinned () {
  return setupPromise.then(v => cbPromise(cb => {
    db.all(`SELECT url, title FROM bookmarks WHERE pinned = ?`, [1], cb)
  }))
}

export function list () {
  return setupPromise.then(v => cbPromise(cb => {
    db.all(`SELECT url, title, pinned FROM bookmarks ORDER BY num_visits DESC`, cb)
  }))
}

// internal methods
// =

migrations = [
  // version 1
  function (cb) {
    db.exec(`
      CREATE TABLE bookmarks(
        url NOT NULL,
        title
      );
      CREATE INDEX bookmarks_url ON bookmarks (url);
      INSERT INTO bookmarks (title, url) VALUES ('Beaker Homepage', 'https://beakerbrowser.com');
      INSERT INTO bookmarks (title, url) VALUES ('Beaker Mailing List', 'https://groups.google.com/forum/#!forum/beaker-browser');
      INSERT INTO bookmarks (title, url) VALUES ('DuckDuckGo (the default search engine)', 'https://duckduckgo.com');
      PRAGMA user_version = 1;
    `, cb)
  },
  // version 2
  function (cb) {
    db.exec(`
      ALTER TABLE bookmarks ADD COLUMN num_visits;
      UPDATE bookmarks SET num_visits = 0;
      PRAGMA user_version = 2;
    `, cb)
  },
  // version 3
  function (cb) {
    db.exec(`
      INSERT INTO bookmarks (title, url, num_visits) VALUES ('Welcome to Beaker - dat://hostless.website/', 'dat://hostless.website/', 0);
      INSERT INTO bookmarks (title, url, num_visits) VALUES ('The Dat Protocol - Decentralized Archive Transport', 'dat://www.datprotocol.com', 0);
      PRAGMA user_version = 3;
    `, cb)
  },
  // version 4
  function (cb) {
    db.exec(`
      ALTER TABLE bookmarks ADD COLUMN pinned;
      UPDATE bookmarks SET pinned = 0;
      PRAGMA user_version = 4;
    `, cb)
  }
]
