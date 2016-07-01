import { app, ipcMain } from 'electron'
import sqlite3 from 'sqlite3'
import path from 'path'
import url from 'url'
import { setupDatabase } from '../lib/bg/sqlite-tools'
import log from '../log'

// globals
// =
var db
var migrations
var waitForSetup

// exported methods
// =

export function setup () {
  // open database
  var dbPath = path.join(app.getPath('userData'), 'Bookmarks')
  db = new sqlite3.Database(dbPath)
  waitForSetup = setupDatabase(db, migrations, '[BOOKMARKS]')

  // wire up IPC handlers
  ipcMain.on('bookmarks', onIPCMessage)
}

export function add (url, title, cb) {
  waitForSetup(() => {
    db.run(`
      INSERT OR REPLACE
        INTO bookmarks (url, title)
        VALUES (?, ?)
    `, [url, title], cb)
  })
}

export function changeTitle (url, title, cb) {
  waitForSetup(() => {
    db.run(`UPDATE bookmarks SET title = ? WHERE url = ?`, [title, url], cb)
  })
}

export function changeUrl (oldUrl, newUrl, cb) {
  waitForSetup(() => {
    db.run(`UPDATE bookmarks SET url = ? WHERE url = ?`, [newUrl, oldUrl], cb)
  })
}

export function remove (url, cb) {
  waitForSetup(() => {
    db.run(`DELETE FROM bookmarks WHERE url = ?`, [url], cb)
  })
}

export function get (url, cb) {
  waitForSetup(() => {
    db.get(`SELECT url, title FROM bookmarks WHERE url = ?`, [url], cb)
  })
}

export function list (cb) {
  waitForSetup(() => {
    db.all(`SELECT url, title FROM bookmarks`, cb)
  })
}

// internal methods
// =

// `requestId` is sent with the response, so the requester can match the result data to the original call
function onIPCMessage (event, command, requestId, ...args) {
  // create a reply cb
  const replyCb = (err, value) => event.sender.send('bookmarks', 'reply', requestId, err, value)

  // look up the method called
  var ipcMethods = { add, changeTitle, changeUrl, remove, get, list }
  var ipcMethod = ipcMethods[command]
  if (!ipcMethod) {
    log('[BOOKMARKS] Unknown message command', arguments)
    replyCb(new Error('Invalid command'))
    return
  }

  // run method
  args.push(replyCb)
  ipcMethod.apply(null, args)
}

migrations = [
  // version 1
  function (cb) {
    db.exec(`
      CREATE TABLE bookmarks(
        url NOT NULL,
        title
      );
      CREATE INDEX bookmarks_url ON bookmarks (url);
      INSERT INTO bookmarks (title, url) VALUES ('Beaker Browser', 'https://github.com/pfraze/beaker');
      INSERT INTO bookmarks (title, url) VALUES ('@pfrazee (ask for support!)', 'https://twitter.com/pfrazee');
      INSERT INTO bookmarks (title, url) VALUES ('Dat Protocol', 'http://dat-data.com/');
      INSERT INTO bookmarks (title, url) VALUES ('IPFS Protocol', 'https://ipfs.io/');
      INSERT INTO bookmarks (title, url) VALUES ('SQLite3', 'https://www.sqlite.org/');
      INSERT INTO bookmarks (title, url) VALUES ('DuckDuckGo (the default search engine)', 'https://duckduckgo.com');
      PRAGMA user_version = 1;
    `, cb)
  }
]