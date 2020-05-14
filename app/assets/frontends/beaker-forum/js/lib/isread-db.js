/**
 * Isread DB
 * 
 * A table of URLs and "is read" flags
 */

import { openDB } from '../../vendor/idb/index.js'
import '../../vendor/idb/async-iterators.js'
import { lock } from './lock.js'

// typedefs
// =

/**
 */

// exported api
// =

export var db = undefined

/**
 * @returns {void}
 */
export async function setup () {
  db = await openDB('index:isread', 1, { 
    upgrade (db, oldVersion, newVersion, transaction) {
      var itemsStore = db.createObjectStore('items', {keyPath: 'key'})
    },
    blocked () {
      // TODO do we need to handle this?
      console.debug('index:isread DB is blocked')
    },
    blocking () {
      // TODO do we need to handle this?
      console.debug('index:isread DB is blocking')
    }
  })
}

/**
 * @param {String} key
 * @returns {Promise<Boolean>}
 */
export async function get (key) {
  if (!db) await setup()
  var value = await db.get('items', key)
  return !!value
}

/**
 * @param {String} key
 * @returns {Promise<Void>}
 */
export async function put (key) {
  if (!db) await setup()
  await db.put('items', {key})
}

/**
 * @param {String} key
 * @returns {Promise<Void>}
 */
export async function remove (key) {
  if (!db) await setup()
  await db.delete('items', key)
}