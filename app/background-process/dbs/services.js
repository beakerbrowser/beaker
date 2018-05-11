import { app } from 'electron'
import sqlite3 from 'sqlite3'
import path from 'path'
import assert from 'assert'
import _keyBy from 'lodash.keyby'
import {parse as parseURL} from 'url'
import { cbPromise } from '../../lib/functions'
import {toOrigin} from '../../lib/bg/services'
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
  var dbPath = path.join(app.getPath('userData'), 'Services')
  db = new sqlite3.Database(dbPath)
  setupPromise = setupSqliteDB(db, {migrations}, '[SERVICES]')
}

export async function addService (origin, psaDoc = null) {
  await setupPromise
  assert(origin && typeof origin === 'string', 'Origin must be a string')
  origin = toOrigin(origin)

  // update service records
  await cbPromise(cb => {
    var title = psaDoc && typeof psaDoc.title === 'string' ? psaDoc.title : ''
    var description = psaDoc && typeof psaDoc.description === 'string' ? psaDoc.description : ''
    var createdAt = Date.now()
    db.run(
      `UPDATE services SET title=?, description=? WHERE origin=?`,
      [title, description, origin],
      cb
    )
    db.run(
      `INSERT OR IGNORE INTO services (origin, title, description, createdAt) VALUES (?, ?, ?, ?)`,
      [origin, title, description, createdAt],
      cb
    )
  })

  // remove any existing links
  await cbPromise(cb => db.run(`DELETE FROM links WHERE origin = ?`, [origin], cb))

  // add new links
  if (psaDoc && psaDoc.links && Array.isArray(psaDoc.links)) {
    // add one link per rel type
    var links = []
    psaDoc.links.forEach(link => {
      if (!(link && typeof link === 'object' && typeof link.href === 'string' && typeof link.rel === 'string')) {
        return
      }
      var {rel, href, title} = link
      rel.split(' ').forEach(rel => links.push({rel, href, title}))
    })

    // insert values
    await Promise.all(links.map(link => cbPromise(cb => {
      var {rel, href, title} = link
      title = typeof title === 'string' ? title : ''
      db.run(
        `INSERT INTO links (origin, rel, href, title) VALUES (?, ?, ?, ?)`,
        [origin, rel, href, title],
        cb
      )
    })))
  }
}

export async function removeService (origin) {
  await setupPromise
  assert(origin && typeof origin === 'string', 'Origin must be a string')
  origin = toOrigin(origin)
  await cbPromise(cb => db.run(`DELETE FROM services WHERE origin = ?`, [origin], cb))
}

export async function addAccount (origin, username, password) {
  await setupPromise
  assert(origin && typeof origin === 'string', 'Origin must be a string')
  assert(username && typeof username === 'string', 'Username must be a string')
  assert(password && typeof password === 'string', 'Password must be a string')
  origin = toOrigin(origin)

  // delete existing account
  await cbPromise(cb => db.run(`DELETE FROM accounts WHERE origin = ? AND username = ?`, [origin, username], cb))

  // add new account
  await cbPromise(cb => db.run(`INSERT INTO accounts (origin, username, password) VALUES (?, ?, ?)`, [origin, username, password], cb))
}

export async function removeAccount (origin, username) {
  await setupPromise
  assert(origin && typeof origin === 'string', 'Origin must be a string')
  assert(username && typeof username === 'string', 'Username must be a string')
  origin = toOrigin(origin)
  await cbPromise(cb => db.run(`DELETE FROM accounts WHERE origin = ? AND username = ?`, [origin, username], cb))
}

export async function getService (origin) {
  var services = await listServices({origin})
  return Object.values(services)[0]
}

export async function getAccount (origin, username) {
  await setupPromise
  origin = toOrigin(origin)
  var query = 'SELECT username, password, origin FROM accounts WHERE origin = ? AND username = ?'
  return cbPromise(cb => db.get(query, [origin, username], cb))
}

export async function listServices ({origin} = {}) {
  await setupPromise
  if (origin) {
    origin = toOrigin(origin)
  }

  // construct query
  var where = ['1=1']
  var params = []
  if (origin) {
    where.push('origin = ?')
    params.push(origin)
  }
  where = where.join(' AND ')

  // run query
  var query = `
    SELECT origin, title, description, createdAt
      FROM services
      WHERE ${where}
  `
  var services = await cbPromise(cb => db.all(query, params, cb))

  // get links on each
  await Promise.all(services.map(async (service) => {
    service.links = await listServiceLinks(service.origin)
    service.accounts = await listServiceAccounts(service.origin)
  }))

  return _keyBy(services, 'origin') // return as an object
}

export async function listAccounts ({api} = {}) {
  await setupPromise

  // construct query
  var join = ''
  var where = ['1=1']
  var params = []
  if (api) {
    where.push('links.rel = ?')
    params.push(api)
    join = 'LEFT JOIN links ON links.origin = accounts.origin'
  }
  where = where.join(' AND ')

  // run query
  var query = `
    SELECT accounts.username, accounts.origin
      FROM accounts
      ${join}
      WHERE ${where}
  `
  return cbPromise(cb => db.all(query, params, cb))
}

export async function listServiceLinks (origin) {
  await setupPromise
  origin = toOrigin(origin)
  var query = 'SELECT rel, title, href FROM links WHERE origin = ?'
  return cbPromise(cb => db.all(query, [origin], cb))
}

export async function listServiceAccounts (origin) {
  await setupPromise
  origin = toOrigin(origin)
  var query = 'SELECT username FROM accounts WHERE origin = ?'
  return cbPromise(cb => db.all(query, [origin], cb))
}

// internal methods
// =

migrations = [
  // version 1
  function (cb) {
    db.exec(`
      CREATE TABLE services (
        origin TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        createdAt INTEGER
      );
      CREATE TABLE accounts (
        origin TEXT,
        username TEXT,
        password TEXT,
        createdAt INTEGER,

        FOREIGN KEY (origin) REFERENCES services (origin) ON DELETE CASCADE
      );
      CREATE TABLE links (
        origin TEXT,
        rel TEXT,
        title TEXT,
        href TEXT,

        FOREIGN KEY (origin) REFERENCES services (origin) ON DELETE CASCADE
      );

      PRAGMA user_version = 1;
    `, cb)
  }
]
