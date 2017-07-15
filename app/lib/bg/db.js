var debug = require('debug')('beaker')
import FnQueue from 'function-queue'
import { cbPromise } from '../functions'

// transaction lock
// - returns a function which enforces FIFO execution on async behaviors, via a queue
// - call sig: txLock(cb => { ...; cb() })
// - MUST call given cb to release the lock
export function makeTxLock () {
  var fnQueue = FnQueue()
  return cb => fnQueue.push(cb)
}

// sqlite transactor, handles common needs for sqlite queries:
// 1. waits for the setupPromise
// 2. provides a cb handler that returns a promise
// 3. creates a transaction lock, and wraps the cb with it
// NOTE: 
//   Using the transactor does mean that the DB is locked into sequential operation.
//   This is slower, but necessary if the SQLite instance has any transactions that
//   do async work within them; eg, SELECT then UPDATE.
//   Why: without the tx lock around all SQLite statements, you can end up injecting
//   new commands into the active async transaction.
//   If the DB doesn't do async transactions, you don't need the transactor. At time of
//   writing this, only the history DB needed it.
//   -prf
export function makeSqliteTransactor (setupPromise) {
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

// runs needed migrations, returns a promise
export function setupSqliteDB (db, migrations, logTag) {
  return new Promise((resolve, reject) => {
    // run migrations
    db.get('PRAGMA user_version;', (err, res) => {
      if (err) return reject(err)

      var version = (res && res.user_version) ? +res.user_version : 0
      var neededMigrations = migrations.slice(version)
      if (neededMigrations.length == 0) { return resolve() }

      debug(logTag, 'Database at version', version, '; Running', neededMigrations.length, 'migrations')
      runNeededMigrations()
      function runNeededMigrations (err) {
        if (err) return reject(err)

        var migration = neededMigrations.shift()
        if (!migration) {
          // done
          resolve()
          return debug(logTag, 'Database migrations completed without error')
        }

        migration(runNeededMigrations)
      }
    })
  })
}
