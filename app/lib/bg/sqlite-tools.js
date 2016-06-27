import log from '../../log'

export function setupDatabase (db, migrations, logTag) {
  // run migrations
  db.get('PRAGMA user_version;', (err, res) => {
    if (err) throw err

    var version = (res && res.user_version) ? +res.user_version : 0
    var neededMigrations = migrations.slice(version)
    if (neededMigrations.length == 0)
      return

    log(logTag, 'Database at version', version, '; Running', neededMigrations.length, 'migrations')
    runNeededMigrations()
    function runNeededMigrations (err) {
      if (err) throw err

      var migration = neededMigrations.shift()
      if (!migration)
        return log(logTag, 'Database migrations completed without error') // done

      migration(runNeededMigrations)
    }
  })
}