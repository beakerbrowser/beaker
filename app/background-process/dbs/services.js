import { app } from 'electron'
import sqlite3 from 'sqlite3'
import path from 'path'
import assert from 'assert'
import _keyBy from 'lodash.keyby'
import {parse as parseURL} from 'url'
import { cbPromise } from '../../lib/functions'
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

export const WEBAPI = {
  addService,
  removeService,
  addAccount,
  removeAccount,

  getService,
  getAccount,

  listServices,
  listAccounts,
  listServiceLinks,
  listServiceAccounts
}

export async function addService (hostname, psaDoc = null) {
  await setupPromise
  assert(hostname && typeof hostname === 'string', 'Hostname must be a string')
  hostname = getHostname(hostname)

  // update service records
  await cbPromise(cb => {
    var title = psaDoc && typeof psaDoc.title === 'string' ? psaDoc.title : ''
    var description = psaDoc && typeof psaDoc.description === 'string' ? psaDoc.description : ''
    var createdAt = Date.now()
    db.run(
      `UPDATE services SET title=?, description=? WHERE hostname=?`,
      [title, description, hostname],
      cb
    )
    db.run(
      `INSERT OR IGNORE INTO services (hostname, title, description, createdAt) VALUES (?, ?, ?, ?)`,
      [hostname, title, description, createdAt],
      cb
    )
  })

  // remove any existing links
  await cbPromise(cb => db.run(`DELETE FROM links WHERE serviceHostname = ?`, [hostname], cb))

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
        `INSERT INTO links (serviceHostname, rel, href, title) VALUES (?, ?, ?, ?)`,
        [hostname, rel, href, title],
        cb
      )
    })))
  }
}

export async function removeService (hostname) {
  await setupPromise
  assert(hostname && typeof hostname === 'string', 'Hostname must be a string')
  hostname = getHostname(hostname)
  await cbPromise(cb => db.run(`DELETE FROM services WHERE hostname = ?`, [hostname], cb))
}

export async function addAccount (hostname, {username, password}) {
  await setupPromise
  assert(hostname && typeof hostname === 'string', 'Hostname must be a string')
  assert(username && typeof username === 'string', 'Username must be a string')
  assert(password && typeof password === 'string', 'Password must be a string')
  hostname = getHostname(hostname)

  // delete existing account
  await cbPromise(cb => db.run(`DELETE FROM accounts WHERE serviceHostname = ? AND username = ?`, [hostname, username], cb))

  // add new account
  await cbPromise(cb => db.run(`INSERT INTO accounts (serviceHostname, username, password) VALUES (?, ?, ?)`, [hostname, username, password], cb))
}

export async function removeAccount (hostname, username) {
  await setupPromise
  assert(hostname && typeof hostname === 'string', 'Hostname must be a string')
  assert(username && typeof username === 'string', 'Username must be a string')
  hostname = getHostname(hostname)
  await cbPromise(cb => db.run(`DELETE FROM accounts WHERE serviceHostname = ? AND username = ?`, [hostname, username], cb))
}

export async function getService (hostname) {
  var services = await listServices({hostname})
  return Object.values(services)[0]
}

export async function getAccount (hostname, username) {
  await setupPromise
  hostname = getHostname(hostname)
  var query = 'SELECT username, password, serviceHostname FROM accounts WHERE serviceHostname = ? AND username = ?'
  return cbPromise(cb => db.get(query, [hostname, username], cb))
}

export async function listServices ({hostname} = {}) {
  await setupPromise
  if (hostname) {
    hostname = getHostname(hostname)
  }

  // construct query
  var where = ['1=1']
  var params = []
  if (hostname) {
    where.push('hostname = ?')
    params.push(hostname)
  }
  where = where.join(' AND ')

  // run query
  var query = `
    SELECT hostname, title, description, createdAt
      FROM services
      WHERE ${where}
  `
  var services = await cbPromise(cb => db.all(query, params, cb))

  // get links on each
  await Promise.all(services.map(async (service) => {
    service.links = await listServiceLinks(service.hostname)
    service.accounts = await listServiceAccounts(service.hostname)
  }))

  return _keyBy(services, 'hostname') // return as an object
}

export async function listAccounts ({rel} = {}) {
  await setupPromise

  // construct query
  var join = ''
  var where = ['1=1']
  var params = []
  if (rel) {
    where.push('links.rel=?')
    params.push(rel)
    join = 'LEFT JOIN links ON links.serviceHostname = accounts.serviceHostname'
  }
  where = where.join(' AND ')

  // run query
  var query = `
    SELECT accounts.username, accounts.serviceHostname
      FROM accounts
      ${join}
      WHERE ${where}
  `
  return cbPromise(cb => db.all(query, params, cb))
}

export async function listServiceLinks (hostname) {
  await setupPromise
  hostname = getHostname(hostname)
  var query = 'SELECT rel, title, href FROM links WHERE serviceHostname = ?'
  return cbPromise(cb => db.all(query, [hostname], cb))
}

export async function listServiceAccounts (hostname) {
  await setupPromise
  hostname = getHostname(hostname)
  var query = 'SELECT username FROM accounts WHERE serviceHostname = ?'
  return cbPromise(cb => db.all(query, [hostname], cb))
}

// internal methods
// =

function getHostname (url) {
  return parseURL(url).hostname || url
}

migrations = [
  // version 1
  function (cb) {
    db.exec(`
      CREATE TABLE services (
        hostname TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        createdAt INTEGER
      );
      CREATE TABLE accounts (
        serviceHostname TEXT,
        username TEXT,
        password TEXT,
        createdAt INTEGER,

        FOREIGN KEY (serviceHostname) REFERENCES services (hostname) ON DELETE CASCADE
      );
      CREATE TABLE links (
        serviceHostname TEXT,
        rel TEXT,
        title TEXT,
        href TEXT,

        FOREIGN KEY (serviceHostname) REFERENCES services (hostname) ON DELETE CASCADE
      );

      PRAGMA user_version = 1;
    `, cb)
  }
]
