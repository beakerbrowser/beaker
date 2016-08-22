import { app } from 'electron'
import sqlite3 from 'sqlite3'
import path from 'path'
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
  var dbPath = path.join(app.getPath('userData'), 'Settings')
  db = new sqlite3.Database(dbPath)
  setupPromise = setupDatabase2(db, migrations, '[SETTINGS]')
}

export function set (key, value) {
  return setupPromise.then(v => cbPromise(cb => {
    db.run(`
      INSERT OR REPLACE
        INTO settings (key, value, ts)
        VALUES (?, ?, ?)
    `, [key, value, Date.now()], cb)
  }))
}

export function get (key) {
  return setupPromise.then(v => cbPromise(cb => {
    db.get(`SELECT value FROM settings WHERE key = ?`, [key], (err, row) => {
      if (row)
        row = row.value
      cb(err, row)
    })
  }))
}

export function getAll () {
  return setupPromise.then(v => cbPromise(cb => {
    db.all(`SELECT key, value FROM settings`, (err, rows) => {
      if (err)
        return cb(err)

      var obj = {}
      rows.forEach(row => obj[row.key] = row.value)
      cb(null, obj)
    })
  }))
}

// internal methods
// =

migrations = [
  // version 1
  function (cb) {
    db.exec(`
      CREATE TABLE settings(
        key PRIMARY KEY,
        value,
        ts
      );
      INSERT INTO settings (key, value) VALUES ('auto_update_enabled', 1);
      PRAGMA user_version = 1;
    `, cb)
  }
]