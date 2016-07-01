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
  var dbPath = path.join(app.getPath('userData'), 'SiteData')
  db = new sqlite3.Database(dbPath)
  waitForSetup = setupDatabase(db, migrations, '[SITEDATA]')

  // wire up IPC handlers
  ipcMain.on('sitedata', onIPCMessage)
}

export function set (origin, key, value, cb) {
  waitForSetup(() => {
    origin = extractOrigin(origin)
    db.run(`
      INSERT OR REPLACE
        INTO sitedata (origin, key, value)
        VALUES (?, ?, ?)
    `, [origin, key, value], cb)
  })
}

export function get (origin, key, cb) {
  waitForSetup(() => {
    origin = extractOrigin(origin)
    db.get(`SELECT value FROM sitedata WHERE origin = ? AND key = ?`, [origin, key], (err, res) => {
      if (err)
        return cb(err)
      cb(null, res && res.value)
    })
  })
}

// internal methods
// =

function extractOrigin (originURL) {
  var urlp = url.parse(originURL)
  if (!urlp || !urlp.host || !urlp.protocol)
    return log('[SITEDATA] Received message from a page with an unparseable URL:', originURL)
  return (urlp.protocol + urlp.host + (urlp.port || ''))
}

// `requestId` is sent with the response, so the requester can match the result data to the original call
function onIPCMessage (event, command, requestId, ...args) {
  const replyCb = (err, value) => event.sender.send('sitedata', 'reply', requestId, err, value)

  // run command
  switch (command) {
    case 'get': return get(event.sender.getURL(), ...args, replyCb)
    case 'set': return set(event.sender.getURL(), ...args, replyCb)
    case 'getOtherOrigin': return get(args[0], args[1], replyCb)
    case 'setOtherOrigin': return set(args[0], args[1], args[2], replyCb)
    default: log('[SITEDATA] Unknown message command', arguments)
  }
}

migrations = [
  // version 1
  function (cb) {
    db.exec(`
      CREATE TABLE sitedata(
        origin NOT NULL,
        key NOT NULL,
        value
      );
      CREATE UNIQUE INDEX sitedata_origin_key ON sitedata (origin, key);
      PRAGMA user_version = 1;
    `, cb)
  }
]