import sqlite3 from 'sqlite3'
import path from 'path'
import { cbPromise } from '../../lib/functions'
import { setupSqliteDB, handleQueryBuilder } from '../lib/db'

import V1 from './schemas/profile-data.v1.sql'
import V2 from './schemas/profile-data.v2.sql'
import V3 from './schemas/profile-data.v3.sql'
import V4 from './schemas/profile-data.v4.sql'
import V5 from './schemas/profile-data.v5.sql'
import V6 from './schemas/profile-data.v6.sql'
import V7 from './schemas/profile-data.v7.sql'
import V8 from './schemas/profile-data.v8.sql'
import V9 from './schemas/profile-data.v9.sql'
import V10 from './schemas/profile-data.v10.sql'
import V11 from './schemas/profile-data.v11.sql'
import V12 from './schemas/profile-data.v12.sql'
import V13 from './schemas/profile-data.v13.sql'
import V14 from './schemas/profile-data.v14.sql'
import V15 from './schemas/profile-data.v15.sql'
import V16 from './schemas/profile-data.v16.sql'
import V17 from './schemas/profile-data.v17.sql'
import V18 from './schemas/profile-data.v18.sql'
import V19 from './schemas/profile-data.v19.sql'
import V20 from './schemas/profile-data.v20.sql'
import V21 from './schemas/profile-data.v21.sql'
import V22 from './schemas/profile-data.v22.sql'
import V23 from './schemas/profile-data.v23.sql'
import V24 from './schemas/profile-data.v24.sql'
import V25 from './schemas/profile-data.v25.sql'
import V26 from './schemas/profile-data.v26.sql'
import V27 from './schemas/profile-data.v27.sql'
import V28 from './schemas/profile-data.v28.sql'
import V29 from './schemas/profile-data.v29.sql'
import V30 from './schemas/profile-data.v30.sql'
import V31 from './schemas/profile-data.v31.sql'
import V32 from './schemas/profile-data.v32.sql'
import V33 from './schemas/profile-data.v33.sql'
import V34 from './schemas/profile-data.v34.sql'
import V35 from './schemas/profile-data.v35.sql'
import V36 from './schemas/profile-data.v36.sql'
import V37 from './schemas/profile-data.v37.sql'
import V38 from './schemas/profile-data.v38.sql'
import V39 from './schemas/profile-data.v39.sql'
import V40 from './schemas/profile-data.v40.sql'
import V41 from './schemas/profile-data.v41.sql'
import V42 from './schemas/profile-data.v42.sql'
import V43 from './schemas/profile-data.v43.sql'
import V44 from './schemas/profile-data.v44.sql'
import V45 from './schemas/profile-data.v45.sql'
import V46 from './schemas/profile-data.v46.sql'
import V47 from './schemas/profile-data.v47.sql'
import V48 from './schemas/profile-data.v48.sql'
import V49 from './schemas/profile-data.v49.sql'
import V50 from './schemas/profile-data.v50.sql'

// typedefs
// =

/**
 * @typedef {Object} SQLiteResult
 * @prop {string} lastID
 */

// globals
// =

var db
var migrations
var setupPromise

// exported methods
// =

/**
 * @param {Object} opts
 * @param {string} opts.userDataPath
 */
export const setup = function (opts) {
  // open database
  var dbPath = path.join(opts.userDataPath, 'Profiles')
  db = new sqlite3.Database(dbPath)
  setupPromise = setupSqliteDB(db, {migrations}, '[PROFILES]')
}

/**
 * @param {...(any)} args
 * @return {Promise<any>}
 */
export const get = async function (...args) {
  await setupPromise
  args = handleQueryBuilder(args)
  return cbPromise(cb => db.get(...args, cb))
}

/**
 * @param {...(any)} args
 * @return {Promise<Array<any>>}
 */
export const all = async function (...args) {
  await setupPromise
  args = handleQueryBuilder(args)
  return cbPromise(cb => db.all(...args, cb))
}

/**
 * @param {...(any)} args
 * @return {Promise<SQLiteResult>}
 */
export const run = async function (...args) {
  await setupPromise
  args = handleQueryBuilder(args)
  return cbPromise(cb => db.run(...args, function (err) {
    if (err) cb(err)
    else cb(null, {lastID: this.lastID})
  }))
}

/**
 * @returns {Promise<void>}
 */
export const serialize = function () {
  return db.serialize()
}

/**
 * @returns {Promise<void>}
 */
export const parallelize = function () {
  return db.parallelize()
}

export const getSqliteInstance = () => db

// internal methods
// =

function setupDb (cb) {
  db.exec(FULL_SCHEMA, cb)
}
migrations = [
  migration(V1),
  migration(V2),
  migration(V3),
  migration(V4),
  migration(V5),
  migration(V6),
  migration(V7),
  migration(V8),
  migration(V9),
  migration(V10),
  migration(V11),
  migration(V12),
  migration(V13),
  migration(V14),
  migration(V15),
  migration(V16, {canFail: true}), // set canFail because we made a mistake in the rollout of this update, see https://github.com/beakerbrowser/beaker/issues/934
  migration(V17),
  migration(V18),
  migration(V19),
  migration(V20),
  migration(V21),
  migration(V22, {canFail: true}), // canFail for the same reason as v16, ffs
  migration(V23),
  migration(V24),
  migration(V25),
  migration(V26),
  migration(V27),
  migration(V28),
  migration(V29),
  migration(V30),
  migration(V31),
  migration(V32),
  migration(V33),
  migration(V34),
  migration(V35),
  migration(V36),
  migration(V37),
  migration(V38),
  migration(V39),
  migration(V40),
  migration(V41),
  migration(V42),
  migration(V43),
  migration(V44),
  migration(V45),
  migration(V46),
  migration(V47),
  migration(V48),
  migration(V49),
  migration(V50)
]
function migration (file, opts = {}) {
  return cb => {
    if (opts.canFail) {
      var orgCb = cb
      cb = () => orgCb() // suppress the error
    }
    db.exec(file, cb)
  }
}
