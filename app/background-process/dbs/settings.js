import { app } from 'electron'
import sqlite3 from 'sqlite3'
import path from 'path'
import { setupDatabase } from '../../lib/bg/sqlite-tools'
import log from '../../log'

// globals
// =
var db
var migrations
var waitForSetup

// exported methods
// =

export function setup () {
  // open database
  var dbPath = path.join(app.getPath('userData'), 'Settings')
  db = new sqlite3.Database(dbPath)
  waitForSetup = setupDatabase(db, migrations, '[SETTINGS]')
}

export function set (key, value, cb) {
  waitForSetup(() => {
    db.run(`
      INSERT OR REPLACE
        INTO settings (key, value, ts)
        VALUES (?, ?, ?)
    `, [key, value, Date.now()], cb)
  })
}

export function get (key, cb) {
  waitForSetup(() => {
    db.get(`SELECT value FROM settings WHERE key = ?`, [key], cb)
  })
}

export function getAll (cb) {
  waitForSetup(() => {
    db.all(`SELECT key, value FROM settings`, (err, rows) => {
      if (err)
        return cb(err)

      var obj = {}
      rows.forEach(row => obj[row.key] = row.value)
      cb(null, obj)
    })
  })
}

// internal methods
// =

migrations = [
  // version 1
  function (cb) {
    db.exec(`
      CREATE TABLE settings(
        key NOT NULL,
        value,
        ts
      );
      CREATE INDEX settings_key ON settings (key);
      INSERT INTO settings (key, value) VALUES ('auto_update_enabled', 1);
      PRAGMA user_version = 1;
    `, cb)
  }
]