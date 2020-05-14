import sqlite3 from 'sqlite3'
import path from 'path'
import { parseDriveUrl } from '../../lib/urls'
import knex from '../lib/knex'
import { cbPromise } from '../../lib/functions'
import { setupSqliteDB } from '../lib/db'
import EventEmitter from 'events'
import { Readable } from 'stream'

// globals
// =

var db
var migrations
var events = new EventEmitter()

// exported methods
// =

export const WEBAPI = {
  listAuditLog: list,
  streamAuditLog: stream,
  getAuditLogStats: stats
}

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

export async function record (caller, method, args, writeSize, fn, opts) {
  var ts = Date.now()
  try {
    var res = await fn()
    return res
  } finally {
    var runtime = Date.now() - ts
    if (!opts || !opts.ignoreFast || runtime > 100) {
      var target
      if (args.url) {
        target = extractHostname(args.url)
        delete args.url
      }
      caller = extractOrigin(caller)
      if (method === 'query' && args.drive) {
        // massage the opts
        args = Object.assign({}, args)
        if (Array.isArray(args.drive)) {
          args.drive = args.drive.map(d => d.url)
        } else {
          args.drive = args.drive.url
        }
      }
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
}

export async function list ({keys, offset, limit} = {keys: [], offset: 0, limit: 100}) {
  var query = knex('hyperdrive_ops').select(...(keys || [])).offset(offset).limit(limit).orderBy('rowid', 'desc')
  var queryAsSql = query.toSQL()
  return cbPromise(cb => db.all(queryAsSql.sql, queryAsSql.bindings, cb))
}

export async function stream () {
  var s = new Readable({
    read () {},
    objectMode: true
  })
  const onData = detail => s.push(['data', {detail}])
  events.on('insert', onData)
  s.on('close', e => events.removeListener('insert', onData))
  return s
}

export async function stats () {
  var query = knex('hyperdrive_ops').select().orderBy('runtime', 'desc').toSQL()
  var rows = await cbPromise(cb => db.all(query.sql, query.bindings, cb))
  var stats = {
    runtime: {
      avg: 0,
      stdDev: 0,
      longest10: rows.slice(0, 10)
    }
  }
  stats.runtime.avg = rows.reduce((acc, row) => acc + row.runtime, 0) / rows.length
  stats.runtime.stdDev = Math.sqrt(
   (rows
      .map(row => Math.pow(row.runtime - stats.runtime.avg, 2)) // (v-mean)^2
      .reduce((acc, v) => acc + v, 0)
    ) / rows.length // averaged
  )
  return stats
}

// internal methods
// =

function insert (table, data) {
  var query = knex(table).insert(data)
  var queryAsSql = query.toSQL()
  db.run(queryAsSql.sql, queryAsSql.bindings)
  events.emit('insert', data)
}

/**
 * @param {string} originURL
 * @returns {string}
 */
function extractOrigin (originURL) {
  if (!originURL || !originURL.includes('://')) return originURL
  var urlp = parseDriveUrl(originURL)
  if (!urlp || !urlp.host || !urlp.protocol) return
  return (urlp.protocol + '//' + urlp.host + (urlp.port ? `:${urlp.port}` : ''))
}

/**
 * @param {string} originURL
 * @returns {string}
 */
function extractHostname (originURL) {
  var urlp = parseDriveUrl(originURL)
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
