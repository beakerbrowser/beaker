import { app } from 'electron'
import sqlite3 from 'sqlite3'
import path from 'path'
import url from 'url'
import rpc from 'pauls-electron-rpc'
import manifest from '../api-manifests/bookmarks'
import { cbPromise } from '../../lib/functions'
import { setupDatabase2 } from '../../lib/bg/sqlite-tools'
import log from '../../log'

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
  setupPromise = setupDatabase2(db, migrations, '[BOOKMARKS]')

  // wire up RPC
  rpc.exportAPI('beakerBookmarks', manifest, { add, changeTitle, changeUrl, addVisit, remove, get, list })
}

export function add (url, title) {
  return setupPromise.then(v => cbPromise(cb => {
    db.run(`
      INSERT OR REPLACE
        INTO bookmarks (url, title, num_visits)
        VALUES (?, ?, 0)
    `, [url, title], cb)
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

export function list () {
  return setupPromise.then(v => cbPromise(cb => {
    db.all(`SELECT url, title FROM bookmarks ORDER BY num_visits DESC`, cb)
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
      INSERT INTO bookmarks (title, url) VALUES ('Beaker Browser Homepage', 'https://github.com/pfrazee/beaker');
      INSERT INTO bookmarks (title, url) VALUES ('Dat Protocol', 'http://dat-data.com/');
      INSERT INTO bookmarks (title, url) VALUES ('IPFS Protocol', 'https://ipfs.io');
      INSERT INTO bookmarks (title, url) VALUES ('DuckDuckGo (the default search engine)', 'https://duckduckgo.com');
      INSERT INTO bookmarks (title, url) VALUES ('Some IPFS Links', 'ipfs:/ipfs/QmU5XsVwvJfTcCwqkK1SmTqDmXWSQWaTa7ZcVLY2PDxNxG/ipfs_links.html');
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
  }
]