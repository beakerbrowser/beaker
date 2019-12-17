import sqlite3 from 'sqlite3'
import path from 'path'
import parseDatUrl from 'parse-dat-url'
import knex from '../lib/knex'
import { cbPromise } from '../../lib/functions'
import { setupSqliteDB } from '../lib/db'

// globals
// =

var db
var migrations

// exported methods
// =

/**
 * @param {Object} opts
 * @param {string} opts.userDataPath
 */
export async function setup (opts) {
  // open database
  var dbPath = path.join(opts.userDataPath, 'AuditLog')
  db = new sqlite3.Database(dbPath)
  await setupSqliteDB(db, {migrations}, '[AUDIT-LOG]')
  db.run('delete from hyperdrive_ops;') // clear history
}

export async function record (caller, method, args, writeSize, fn) {
  var ts = Date.now()
  try {
    var res = await fn()
    return res
  } finally {
    var runtime = Date.now() - ts
    var target
    if (args.url) {
      target = extractHostname(args.url)
      delete args.url
    }
    caller = extractOrigin(caller)
    insert('hyperdrive_ops', {
      caller,
      method,
      target,
      args: args ? JSON.stringify(args) : args,
      writeSize,
      ts,
      runtime
    })
    if (writeSize) insert('hyperdrive_write_stats', {caller, writeSize})
  }
}

export async function list ({keys, offset, limit} = {keys: [], offset: 0, limit: 100}) {
  var query = knex('hyperdrive_ops').select(...(keys || [])).offset(offset).limit(limit).orderBy('rowid', 'desc')
  var queryAsSql = query.toSQL()
  return cbPromise(cb => db.all(queryAsSql.sql, queryAsSql.bindings, cb))
}

// internal methods
// =

function insert (table, data) {
  var query = knex(table).insert(data)
  var queryAsSql = query.toSQL()
  db.run(queryAsSql.sql, queryAsSql.bindings)
}

/**
 * @param {string} originURL
 * @returns {string}
 */
function extractOrigin (originURL) {
  var urlp = parseDatUrl(originURL)
  if (!urlp || !urlp.host || !urlp.protocol) return
  return (urlp.protocol + '//' + urlp.host + (urlp.port ? `:${urlp.port}` : ''))
}

/**
 * @param {string} originURL
 * @returns {string}
 */
function extractHostname (originURL) {
  var urlp = parseDatUrl(originURL)
  return urlp.host
}

migrations = [
  // version 1
  function (cb) {
    db.exec(`
      CREATE TABLE hyperdrive_ops (
        caller NOT NULL,
        method NOT NULL,
        target,
        args,
        ts,
        runtime,
        writeSize
      );
      CREATE INDEX hyperdrive_ops_caller ON hyperdrive_ops (caller);
      CREATE INDEX hyperdrive_ops_target ON hyperdrive_ops (target);
      CREATE TABLE hyperdrive_write_stats (
        caller NOT NULL,
        writeSize
      );
      CREATE INDEX hyperdrive_write_stats_caller ON hyperdrive_write_stats (caller);
      PRAGMA user_version = 1;
    `, cb)
  }
]
