/**
 * Notifications Index
 * 
 * We track the version of each user drive.
 * The index is updated by diffing from the last "checked" version.
 * All updates are filtered for relevance (e.g. likes on my posts) and then recorded.
 * 
 * Indexes are stored in IndexedDB
 * TODO: The number of events kept should be truncated to 300 to avoid performance degradation.
 * 
 * The index should be scheduled to run in the background during idle time.
 * It will update the index-files periodically so that interruption is not an issue.
 * New notifications are updated as-found so that the UI can alert the user asap.
 */

import { openDB } from '../../vendor/idb/index.js'
import '../../vendor/idb/async-iterators.js'
import { lock } from './lock.js'
import * as uwg from './uwg.js'

// typedefs
// =

/**
 * @typedef {Object} NotificationEvent
 * @prop {string} event
 * @prop {string} author
 * @prop {number} timestamp
 * @prop {Object} detail
 * @prop {boolean} isRead
 * 
 * @typedef {Object} NotificationsIndex
 * @param {Object} drives
 * @param {Array<NotificationEvent>} events
 * 
 * @typedef {Object} IndexDefinition
 * @param {string} path
 * @param {function (object, object): boolean} filterFn
 * @param {function (object, object): NotificationEvent} toEvent
 */

// exported api
// =

export var db = undefined
export const events = new EventTarget()

export const STORED_EVENT_LIMIT = 300 // TODO
export const INDEXES = /** @type IndexDefinition[] */([
  {
    path: '/beaker-forum/comments/',
    filterFn (change, {userUrl}) {
      if (change.type !== 'put') return false
      if (!change.value.stat) return false
      var {href, parent} = change.value.stat.metadata
      if (typeof href !== 'string') return false
      return href.startsWith(userUrl) || (parent && parent.startsWith(userUrl))
    },
    toEvent (change, drive) {
      var {href, parent} = change.value.stat.metadata
      return {
        event: 'comment',
        author: drive.url,
        timestamp: basename(change.name),
        detail: {href, parent},
        isRead: false
      }
    }
  }
])

/**
 * @returns {void}
 */
export async function setup () {
  db = await openDB('index:notifications', 1, { 
    upgrade (db, oldVersion, newVersion, transaction) {
      var eventsStore = db.createObjectStore('events', {keyPath: 'timestamp'})
      var drivesStore = db.createObjectStore('drives', {keyPath: 'url'})
    },
    blocked () {
      // TODO do we need to handle this?
      console.debug('index:notifications DB is blocked')
    },
    blocking () {
      // TODO do we need to handle this?
      console.debug('index:notifications DB is blocking')
    }
  })
}

/**
 * @param {Object} [opts]
 * @param {number} [opts.offset]
 * @param {number} [opts.limit]
 * @returns {Promise<NotificationEvent[]>}
 */
export async function list ({offset, limit} = {offset: 0, limit: 50}) {
  if (!db) await setup()
  var end = offset + limit
  var index = 0
  var results = []
  var tx = db.transaction('events', 'readonly')
  for await (let cursor of tx.store.iterate(undefined, 'prev')) {
    if (index >= offset) results.push(cursor.value)
    index++
    if (index >= end) break
  }
  return results
}

/**
 * @param {Object} [opts] 
 * @param {boolean} [opts.isUnread] 
 */
export async function count ({isUnread} = {isUnread: false}) {
  if (!db) await setup()
  if (!isUnread) return db.count('events')
  var count = 0
  var tx = db.transaction('events', 'readonly')
  for await (let cursor of tx.store) {
    if (!cursor.value.isRead) {
      count++
    }
  }
  return count
}

/**
 * @returns {Promise<void>}
 */
export async function markAllRead () {
  if (!db) await setup()
  var release = await lock('notifications-update')
  try {
    var tx = db.transaction('events', 'readwrite')
    for await (let cursor of tx.store) {
      if (!cursor.value.isRead) {
        cursor.value.isRead = true
        cursor.update(cursor.value)
      }
    }
    await tx.done
  } finally {
    release()
  }
}


/**
 * @param {string} userUrl 
 * @returns {Promise<void>}
 */
export async function updateIndex (userUrl) {
  if (!userUrl) return
  if (!db) await setup()
  var release = await lock('notifications-update')
  try {
    var filterOpts = {userUrl}
    var groupUsers = await uwg.users.list()
    var userKeySet = new Set(groupUsers.map(f => f.url))
    userKeySet.delete(userUrl)

    for (let userKey of userKeySet) {
      let drive = hyperdrive.load(userKey)
      let driveMeta = await db.get('drives', drive.url)
      let lastVersion = driveMeta ? driveMeta.version : undefined
      let currentVersion = (await drive.getInfo()).version
      if (typeof lastVersion !== 'number') {
        lastVersion = currentVersion
      }

      let numNewEvents = 0
      for (let INDEX of INDEXES) {
        let changes = await drive.diff(lastVersion, INDEX.path)
        for (let change of changes) {
          if (!INDEX.filterFn(change, filterOpts)) continue
          let evt = INDEX.toEvent(change, drive)
          await db.put('events', evt)
          numNewEvents++
        }
      }

      await db.put('drives', {url: drive.url.toString(), version: currentVersion})
      if (numNewEvents > 0) {
        events.dispatchEvent(new CustomEvent('new-events', {detail: {numNewEvents}}))
      }
    }
  } finally {
    release()
  }
}

// internal methods
// =

var keyRegex = /([0-9a-f]{64})/i
/**
 * @param {string} a 
 * @param {string} b 
 * @returns {Boolean}
 */
function isKeyEq (a = '', b = '') {
  return keyRegex.exec(a)[0] === keyRegex.exec(b)[0]
}

/**
 * @param {string} value
 * @returns {string}
 */
function basename (value) {
  return value.split('/').pop().split('.')[0]
}