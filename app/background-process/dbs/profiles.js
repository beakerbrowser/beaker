import {app} from 'electron'
import sqlite3 from 'sqlite3'
import path from 'path'
import {cbPromise} from '../../lib/functions'
import {setupSqliteDB} from '../../lib/bg/db'

// globals
// =

var db
var migrations
var setupPromise

// exported methods
// =

export function setup () {
  // open database
  var dbPath = path.join(app.getPath('userData'), 'Profiles')
  db = new sqlite3.Database(dbPath)
  setupPromise = setupSqliteDB(db, migrations, '[PROFILES]')
}

export async function get (...args) {
  await setupPromise
  return cbPromise(cb => db.get(...args, cb))
}

export async function all (...args) {
  await setupPromise
  return cbPromise(cb => db.all(...args, cb))
}

export async function run (...args) {
  await setupPromise
  return cbPromise(cb => db.run(...args, cb))
}

// internal methods
// =

migrations = [
  // version 1
  function (cb) {
    db.exec(`
      CREATE TABLE profiles (
        id INTEGER PRIMARY KEY,
        name TEXT
      );
      CREATE TABLE apps (
        profile_id INTEGER,
        name TEXT,
        url TEXT,
        created_at INTEGER,

        PRIMARY KEY (profile_id, name),
        FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
      );
      CREATE TABLE bookmarks (
        profile_id INTEGER,
        url TEXT,
        title TEXT,
        pinned INTEGER,

        PRIMARY KEY (profile_id, url),
        FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
      );
      INSERT INTO profiles (id, name) VALUES (0, 'Default Profile');
      PRAGMA user_version = 1;
    `, cb)
  }
]
