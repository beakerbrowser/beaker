import EventEmitter from 'events'
import sqlite3 from 'sqlite3'
import path from 'path'
import { cbPromise } from '../../lib/functions'
import { setupSqliteDB } from '../lib/db'
import { getEnvVar } from '../lib/env'

const CACHED_VALUES = ['new_tabs_in_foreground']

// globals
// =

var db
var migrations
var setupPromise
var defaultSettings
var events = new EventEmitter()
var cachedValues = {}


// exported methods
// =

/**
 * @param {Object} opts
 * @param {string} opts.userDataPath
 * @param {string} opts.homePath
 */
export const setup = async function (opts) {
  // open database
  var dbPath = path.join(opts.userDataPath, 'Settings')
  db = new sqlite3.Database(dbPath)
  setupPromise = setupSqliteDB(db, {migrations}, '[SETTINGS]')

  defaultSettings = {
    auto_update_enabled: 1,
    auto_redirect_to_dat: 1,
    custom_start_page: 'blank',
    new_tab: 'beaker://desktop/',
    new_tabs_in_foreground: 0,
    run_background: 1,
    default_zoom: 0,
    start_page_background_image: '',
    workspace_default_path: path.join(opts.homePath, 'Sites'),
    default_dat_ignore: '.git\n.dat\nnode_modules\n*.log\n**/.DS_Store\nThumbs.db\n',
    analytics_enabled: 1,
    dat_bandwidth_limit_up: 0,
    dat_bandwidth_limit_down: 0,
    selected_search_engine: 0,
    default_search_engines: [
      {name: 'DuckDuckGo', url: 'https://www.duckduckgo.com/'},
      {name: 'Google', url: 'https://www.google.com/search'}
    ]
  }

  for (let k of CACHED_VALUES) {
    cachedValues[k] = await get(k)
  }
}

export const on = events.on.bind(events)
export const once = events.once.bind(events)

/**
 * @param {string} key
 * @param {string | number | object} value
 * @returns {Promise<void>}
 */
export async function set (key, value) {
  if (['default_search_engines', 'selected_search_engine'].includes(key))
    value = JSON.stringify(value)
  await setupPromise.then(() => cbPromise(cb => {
    db.run(`
      INSERT OR REPLACE
        INTO settings (key, value, ts)
        VALUES (?, ?, ?)
    `, [key, value, Date.now()], cb)
  }))
  if (CACHED_VALUES.includes(key)) cachedValues[key] = value
  events.emit('set', key, value)
  events.emit('set:' + key, value)
}

/**
 * @param {string} key
 * @returns {string | number}
 */
export function getCached (key) {
  return cachedValues[key]
}

/**
 * @param {string} key
 * @returns {boolean | Promise<string | number>}
 */
export const get = function (key) {
  // env variables
  if (key === 'no_welcome_tab') {
    return (Number(getEnvVar('BEAKER_NO_WELCOME_TAB')) === 1)
  }
  // stored values
  return setupPromise.then(() => cbPromise(cb => {
    db.get(`SELECT value FROM settings WHERE key = ?`, [key], (err, row) => {
      if (row) {
        row = row.value
        if (['default_search_engines', 'selected_search_engine'].includes(key))
          row = JSON.parse(row)
      }
      if (typeof row === 'undefined') { row = defaultSettings[key] }
      cb(err, row)
    })
  }))
}

/**
 * @returns {Promise<Object>}
 */
export const getAll = function () {
  return setupPromise.then(v => cbPromise(cb => {
    db.all(`SELECT key, value FROM settings`, (err, rows) => {
      if (err) { return cb(err) }
      var obj = {}
      rows.forEach(row => { obj[row.key] = row.value })
      // parse non-string values
      if (obj.default_search_engines) obj.default_search_engines = JSON.parse(obj.default_search_engines)
      if (obj.selected_search_engine) obj.selected_search_engine = JSON.parse(obj.selected_search_engine)

      obj = Object.assign({}, defaultSettings, obj)
      obj.no_welcome_tab = (Number(getEnvVar('BEAKER_NO_WELCOME_TAB')) === 1)
      cb(null, obj)
    })
  }))
}

// internal methods
// =

migrations = [
  // version 1
  function (cb) {
    db.exec(`
      CREATE TABLE settings(
        key PRIMARY KEY,
        value,
        ts
      );
      INSERT INTO settings (key, value) VALUES ('auto_update_enabled', 1);
      PRAGMA user_version = 1;
    `, cb)
  },
  // version 2
  function (cb) {
    db.exec(`
      INSERT INTO settings (key, value) VALUES ('start_page_background_image', '');
      PRAGMA user_version = 2
    `, cb)
  }
]
