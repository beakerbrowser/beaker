import * as logLib from '../logger'
const logger = logLib.child({category: 'sqlite'})
import FnQueue from 'function-queue'
import { cbPromise } from '../../lib/functions'
import _get from 'lodash.get'

/**
 * Create a transaction lock
 * - returns a function which enforces FIFO execution on async behaviors, via a queue
 * - call sig: txLock(cb => { ...; cb() })
 * - MUST call given cb to release the lock
 * @returns {function(Function): void}
 */
const makeTxLock = exports.makeTxLock = function () {
  var fnQueue = FnQueue()
  return cb => fnQueue.push(cb)
}

/**
 * SQLite transactor, handles common needs for sqlite queries:
 * 1. waits for the setupPromise
 * 2. provides a cb handler that returns a promise
 * 3. creates a transaction lock, and wraps the cb with it
 * NOTE:
 *   Using the transactor does mean that the DB is locked into sequential operation.
 *   This is slower, but necessary if the SQLite instance has any transactions that
 *   do async work within them; eg, SELECT then UPDATE.
 *   Why: without the tx lock around all SQLite statements, you can end up injecting
 *   new commands into the active async transaction.
 *   If the DB doesn't do async transactions, you don't need the transactor. At time of
 *   writing this, only the history DB needed it.
 *   -prf
 * @param {Promise<any>} setupPromise
 * @returns {function(Function): Promise<any>}
 */
export const makeSqliteTransactor = function (setupPromise) {
  var txLock = makeTxLock()
  return function (fn) {
    // 1. wait for the setup promise
    return setupPromise.then(v => {
      // 2. provide a cb handler
      return cbPromise(cb => {
        // 3. create a tx lock
        txLock(endTx => {
          // 3b. wrap the cb with the lock release
          var cbWrapped = (err, res) => {
            endTx()
            cb(err, res)
          }
          // yeesh
          fn(cbWrapped)
        })
      })
    })
  }
}

/**
 * Configures SQLite db and runs needed migrations.
 * @param {any} db
 * @param {Object} opts
 * @param {Function} [opts.setup]
 * @param {Function[]} [opts.migrations]
 */
export const setupSqliteDB = function (db, {setup, migrations}, logTag) {
  return new Promise((resolve, reject) => {
    // configure connection
    db.run('PRAGMA foreign_keys = ON;', (err) => {
      if (err) {
        console.error('Failed to enable FK support in SQLite', err)
      }
    })

    // run migrations
    db.get('PRAGMA user_version;', (err, res) => {
      if (err) return reject(err)

      var version = (res && res.user_version) ? +res.user_version : 0
      var neededMigrations = (version === 0 && setup) ? [setup] : migrations.slice(version)
      if (neededMigrations.length == 0) { return resolve() }

      logger.info(`${logTag} Database at version ${version}; Running ${neededMigrations.length} migrations`)
      db.run('PRAGMA SYNCHRONOUS = OFF;') // turn off fsync to speed up migrations
      runNeededMigrations()
      function runNeededMigrations (err) {
        if (err) {
          logger.error(`${logTag} Failed migration`)
          console.log(err)
          db.run('PRAGMA SYNCHRONOUS = FULL;') // turn fsync back on
          return reject(err)
        }

        var migration = neededMigrations.shift()
        if (!migration) {
          // done
          db.run('PRAGMA SYNCHRONOUS = FULL;') // turn fsync back on
          resolve()
          return logger.info(`${logTag} Database migrations completed without error`)
        }

        migration(runNeededMigrations)
      }
    })
  })
}

export const handleQueryBuilder = function (args) {
  // detect query builders and replace the args
  if (args[0] && _get(args[0], 'constructor.name') === 'Builder') {
    var query = args[0].toSQL()
    return [query.sql, query.bindings]
  }
  return args
}