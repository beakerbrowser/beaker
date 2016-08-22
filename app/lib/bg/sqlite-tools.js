import log from '../../log'

// returns a function which should be used as follows:
/*
var guard
guard = setupDatabase(db, migrations, '[MY_DB]')

// wait for migrations to finish
guard(() => {

  // run code
  db.run(...)
})
*/
export function setupDatabase (db, migrations, logTag) {
  // create migration guard
  var cbs = []
  var migrationGuard = cb => {
    if (cbs) cbs.push(cb)
    else cb()
  }
  var runCbs = () => { cbs.forEach(cb => cb()); cbs = null }

  // run migrations
  db.get('PRAGMA user_version;', (err, res) => {
    if (err) throw err

    var version = (res && res.user_version) ? +res.user_version : 0
    var neededMigrations = migrations.slice(version)
    if (neededMigrations.length == 0)
      return runCbs()

    log(logTag, 'Database at version', version, '; Running', neededMigrations.length, 'migrations')
    runNeededMigrations()
    function runNeededMigrations (err) {
      if (err) throw err

      var migration = neededMigrations.shift()
      if (!migration) {
        // done
        runCbs()
        return log(logTag, 'Database migrations completed without error')
      }

      migration(runNeededMigrations)
    }
  })

  return migrationGuard
}

export function setupDatabase2 (db, migrations, logTag) {
  return new Promise((resolve, reject) => {
    // run migrations
    db.get('PRAGMA user_version;', (err, res) => {
      if (err) return reject(err)

      var version = (res && res.user_version) ? +res.user_version : 0
      var neededMigrations = migrations.slice(version)
      if (neededMigrations.length == 0)
        return resolve()

      log(logTag, 'Database at version', version, '; Running', neededMigrations.length, 'migrations')
      runNeededMigrations()
      function runNeededMigrations (err) {
        if (err) return reject(err)

        var migration = neededMigrations.shift()
        if (!migration) {
          // done
          resolve()
          return log(logTag, 'Database migrations completed without error')
        }

        migration(runNeededMigrations)
      }
    })
  })
}