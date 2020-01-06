/**
 * Notifications Index
 * 
 * We track the version of each followed drive.
 * The index is updated by diffing from the last "checked" version.
 * All updates are filtered for relevance (e.g. likes on my posts) and then recorded.
 * 
 * Indexes are stored in ~/system/beaker.network/
 * The number of events kept is truncated to 300 to avoid performance degradation.
 * 
 * The index should be scheduled to run in the background during idle time.
 * It will update the index-files periodically so that interruption is not an issue.
 * New notifications are updated as-found so that the UI can alert the user asap.
 */

// import { }
import { lock } from './lock.js'
import { ensureDir } from './fs.js'

// typedefs
// =

/**
 * @typedef {Object} NotificationEvent
 * @prop {string} event
 * @prop {string} author
 * @prop {number} timestamp
 * @prop {Object} detail
 * @prop {boolean} read
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

export const events = new EventTarget()

export const STORED_EVENT_LIMIT = 300
export const INDEX_INTERVAL = 90e3 // every 90s
export const INDEXES = /** @type IndexDefinition[] */([
  {
    path: '/likes/',
    filterFn (change, {userUrl}) {
      if (!change.stat) return false
      if (typeof change.stat.metadata.href !== 'string') return false
      return change.stat.metadata.startsWith(userUrl)
    },
    toEvent (change, drive) {
      return {
        event: 'like',
        author: drive.url,
        timestamp: change.stat.ctime,
        detail: {
          href: change.stat.metadata.href
        },
        read: false
      }
    }
  },
  {
    path: '/comments/',
    filterFn (change, {userUrl}) {
      if (!change.stat) return false
      if (typeof change.stat.metadata.href !== 'string') return false
      return change.stat.metadata.startsWith(userUrl)
    },
    toEvent (change, drive) {
      return {
        event: 'comment',
        author: drive.url,
        timestamp: change.stat.ctime,
        detail: {
          href: change.stat.metadata.href,
          replyTo: change.stat.metadata.replyTo
        },
        read: false
      }
    }
  },
  {
    path: '/follows/',
    filterFn (change, {userUrl}) {
      if (!change.mount) return false
      return isKeyEq(change.mount.key, userUrl)
    },
    toEvent (change, drive) {
      return {
        event: 'follow',
        author: drive.url,
        timestamp: change.stat.ctime,
        detail: {},
        read: false
      }
    }
  }
])

/**
 * @returns {void}
 */
export function setup () {
  // TODO should we avoid running after every page load?
  setTimeout(updateIndex, 5e3)
}

/**
 * @param {Object} [opts]
 * @param {number} [opts.offset]
 * @param {number} [opts.limit]
 * @returns {Promise<NotificationEvent[]>}
 */
export async function list ({offset, limit} = {offset: 0, limit: 50}) {
  var index = await readIndex()
  return index.events.slice(offset, offset + limit)
}

/**
 * @param {Object} [opts] 
 * @param {boolean} [opts.unread] 
 */
export async function count ({unread} = {unread: false}) {
  var index = await readIndex()
  if (unread) return index.events.filter(evt => !evt.read).length
  return index.events.length
}

/**
 * @returns {Promise<void>}
 */
export async function markAllRead () {
  var release = await lock('notifications-update')
  try {
    var index = await readIndex()
    for (let evt of index.events) {
      evt.read = true
    }
    await writeIndex(index)
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
 * @returns {Promise<NotificationsIndex>}
 */
async function readIndex () {
  var index
  try {
    index = JSON.parse(await navigator.filesystem.readFile('/system/beaker.network/notifications.json'))
  } catch (e) {
    index = {}
  }
  index.drives = index.drives && typeof index.drives === 'object' ? index.drives : {}
  index.events = index.events && Array.isArray(index.events) ? index.events : []
  index.events = index.events.filter(validateEvent)
  return index
}

/**
 * @param {Object} evt 
 */
function validateEvent (evt) {
  if (!evt || typeof evt !== 'object') return false
  if (typeof evt.event !== 'string') return false
  if (typeof evt.author !== 'string') evt.author = undefined
  if (typeof evt.timestamp !== 'number') evt.timestamp = undefined
  if (typeof evt.detail !== 'object') evt.detail = undefined
  return true
}

/**
 * @param {NotificationsIndex} index 
 * @returns {Promise<void>}
 */
async function writeIndex (index) {
  await ensureDir('/system/beaker.network')
  await navigator.filesystem.writeFile(
    '/system/beaker.network/notifications.json',
    JSON.stringify(index, null, 2)
  )
}

/**
 * @param {string} userUrl 
 * @returns {Promise<void>}
 */
async function updateIndex (userUrl) {
  var release = await lock('notifications-update')
  try {
    var index = await readIndex()
    var filterOpts = {userUrl}
    var followedUsers = await drive.query({
      type: 'mount',
      path: [
        '/profile/follows/*',
        '/profile/follows/*/follows/*',
      ]
    })

    for (let followedUser of followedUsers) {
      let drive = new DatArchive(followedUser.mount.key)
      let lastVersion = index.drives[drive.url]
      var currentVersion = (await drive.getInfo()).version
      if (typeof lastVersion !== 'number') {
        lastVersion = currentVersion
      }

      let events = []
      for (let INDEX of INDEXES) {
        var changes = await drive.diff(lastVersion, INDEX.path)
        changes = changes.filter(c => INDEX.filterFn(c, filterOpts))
        events = events.concat(changes.map(c => INDEX.toEvent(c, drive)))
      }
      let numNewEvents = events.length

      index.drives[drive.url] = currentVersion
      index.events = events.concat(index.events).slice(0, STORED_EVENT_LIMIT)
      await writeIndex(index)
      events.dispatchEvent(new CustomEvent('new-events', {detail: {numNewEvents}}))
    }
  } finally {
    release()
  }
  setTimeout(updateIndex, INDEX_INTERVAL)
}