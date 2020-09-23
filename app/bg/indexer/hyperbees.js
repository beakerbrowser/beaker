import BeakerIndexer from 'beaker-index'
import fetch from 'node-fetch'
import { getHyperspaceClient } from '../hyper/daemon'
import { normalizeOrigin, normalizeUrl, isSameOrigin } from '../../lib/urls'
import { parseSimplePathSpec, toNiceUrl, DRIVE_KEY_REGEX } from '../../lib/strings'
import {
  toArray,
  parseUrl
} from './util'
import { getSite as fullGetSite } from './index'
import { getProfileUrl, getProfile } from '../filesystem/index'
import { getMeta } from '../dbs/archives'
import * as settingsDb from '../dbs/settings'

const SITES_CACHE_TIME = 60e3 * 5 // 5 minutes
const BEAKER_NETWORK_INDEX_KEY = '146100706d88c6ca4ee01fe759a2f154a7be23705a212435efaf2c12e1e5d18d' // TODO fetch from endpoint

/**
 * @typedef {import('./const').Site} Site
 * @typedef {import('./const').SiteDescription} SiteDescription
 * @typedef {import('./const').RecordUpdate} RecordUpdate
 * @typedef {import('./const').ParsedUrl} ParsedUrl
 * @typedef {import('./const').RecordDescription} RecordDescription
 * @typedef {import('../filesystem/query').FSQueryResult} FSQueryResult
 * @typedef {import('./const').NotificationQuery} NotificationQuery
 * @typedef {import('./const').HyperbeeBacklink} HyperbeeBacklink
 */

// globals
// =

var beakerNetworkIndex
var isDisabled = false

// exported api
// =

export async function setup () {
  await configureIndex()

  settingsDb.on('set:extended_network_index', configureIndex)
  settingsDb.on('set:extended_network_index_url', configureIndex)
}

async function configureIndex () {
  var choice = await settingsDb.get('extended_network_index')
  if (choice === 'disabled') {
    isDisabled = true
    return
  }

  var key = BEAKER_NETWORK_INDEX_KEY
  if (choice === 'custom') {
    key = DRIVE_KEY_REGEX.exec(await settingsDb.get('extended_network_index_url'))?.[0]
  }
  if (!key) {
    isDisabled = true
  }

  isDisabled = false
  var client = getHyperspaceClient()
  beakerNetworkIndex = new BeakerIndexer(client.corestore(), client.network, key)
  await beakerNetworkIndex.ready()
}

/**
 * @param {Object} [opts]
 * @param {String} [opts.search]
 * @param {String|String[]} [opts.index] - 'local', 'network', url of a specific hyperbee index
 * @param {Boolean} [opts.writable]
 * @param {Number} [opts.offset]
 * @param {Number} [opts.limit]
 * @returns {Promise<SiteDescription[]>}
 */
export async function listSites (opts) {
  if (isDisabled) return []

  var fullList = await fetchFullSitesList()
  if (opts.search) {
    let search = opts.search.toLowerCase()
    fullList = fullList.filter(s => (
      (s.title || '').toLowerCase().includes(search)
      || (s.description || '').toLowerCase().includes(search)
    ))
  }
  if (typeof opts.writable === 'boolean') {
    fullList = fullList.filter(s => s.writable === opts.writable)
  }
  if (opts.limit && opts.offset) fullList = fullList.slice(opts.offset, opts.limit + opts.offset)
  else if (opts.limit) fullList = fullList.slice(0, opts.limit)
  else if (opts.offset) fullList = fullList.slice(opts.offset)
  return fullList
}

/**
 * @param {String} url 
 * @returns {Promise<SiteDescription>}
 */
export async function getSite (url) {
  if (isDisabled) return undefined
  var origin = normalizeOrigin(url)
  if (!origin.startsWith('hyper://')) return undefined // hyper only for now
  var indexJson = await beakerNetworkIndex.drives.get(origin)
  if (indexJson) {
    return {
      origin: origin,
      url: origin,
      title: indexJson.title || toNiceUrl(origin),
      description: indexJson.description || '',
      writable: false,
      index: {id: 'network'},
      graph: undefined
    }
  }
}

/**
 * @param {Object} opts
 * @param {String|String[]} [opts.origin]
 * @param {String|String[]} [opts.path]
 * @param {String} [opts.links]
 * @param {Boolean|NotificationQuery} [opts.notification]
 * @param {String|String[]} [opts.index] - 'local' or 'network'
 * @param {String} [opts.sort]
 * @param {Number} [opts.offset]
 * @param {Number} [opts.limit]
 * @param {Boolean} [opts.reverse]
 * @param {Object} [internal]
 * @param {RecordDescription[]} [internal.existingResults]
 * @param {Number} [internal.notificationRtime]
 * @returns {Promise<{records: RecordDescription[], missedOrigins: String[]}>}
 */
export async function query (opts, {existingResults, notificationRtime} = {}) {
  if (isDisabled) return {records: [], missedOrigins: undefined}

  var pathQuery = opts.path ? toArray(opts.path).map(parseSimplePathSpec) : undefined
  if (opts.origin) {
    opts.origin = toArray(opts.origin).map(origin => normalizeOrigin(origin))
  }

  var entries
  if (opts.links) {
    let backlinksOpts = {file: true}
    if (typeof opts.limit === 'number') {
      backlinksOpts.limit = opts.limit
    }
    if (typeof opts.reverse === 'boolean') {
      backlinksOpts.reverse = opts.reverse
    }
    entries = /** @type String[]*/(await beakerNetworkIndex.backlinks.get(
      normalizeUrl(opts.links),
      backlinksOpts
    ))
  } else if (opts.notification) {
    let backlinksOpts = {crtime: false, mrtime: false}
    if (opts.sort === 'mtime' || opts.sort === 'mrtime') {
      backlinksOpts.mrtime = true
    } else {
      backlinksOpts.crtime = true
    }
    if (typeof opts.limit === 'number') {
      // custom sorts mean we have to apply the limit after
      if (opts.sort !== 'rtime' && opts.sort !== 'origin') {
        backlinksOpts.limit = opts.limit
      }
    }
    if (typeof opts.reverse === 'boolean') {
      backlinksOpts.reverse = opts.reverse
    }
    entries = /** @type String[]*/(await beakerNetworkIndex.backlinks.get(
      normalizeOrigin(getProfileUrl()),
      backlinksOpts
    ))
  } else {
    entries = []
  }

  entries = entries.filter(entry => {
    var url = entry.value.source
    if (opts.notification) {
      if (isSameOrigin(getProfileUrl(), entry.value.drive)) {
        return false
      }
      if (opts.notification?.unread) {
        if (entry.value.rtime <= notificationRtime) {
          return false
        }
      }
    }
    if (pathQuery) {
      let {pathname} = parseUrl(url)
      let test = q => (
        (!q.extension || pathname.endsWith(q.extension))
        && (!q.prefix || pathname.startsWith(q.prefix + '/'))
      )
      if (!pathQuery.find(test)) {
        return false
      }
    }
    if (opts.origin) {
      if (!opts.origin.includes(normalizeOrigin(url))) {
        return false
      }
    }
    if (existingResults?.length) {
      if (existingResults.find(res => res.url === url)) {
        return false
      }
    }
    return true
  })

  if (opts.sort === 'rtime' || opts.sort === 'origin') {
    // custom sorts
    entries.sort((a, b) => {
      if (opts.sort === 'rtime') {
        return opts.reverse ? (b.value.rtime - a.value.rtime) : (a.value.rtime - b.value.rtime)
      } else if (opts.sort === 'origin') {
        return b.value.drive.localeCompare(a.value.drive) * (opts.reverse ? -1 : 1)
      }
    })

    if (opts.limit) {
      // apply limit after custom sort
      entries = entries.slice(0, opts.limit)
    }
  }

  var records = await Promise.all(entries.map(entry => backlinkToRecord(entry, notificationRtime)))
  return {records, missedOrigins: undefined}
}

/**
 * @param {Object} [opts]
 * @param {String|Array<String>} [opts.origin]
 * @param {String|Array<String>} [opts.path]
 * @param {String} [opts.links]
 * @param {Boolean|NotificationQuery} [opts.notification]
 * @param {Object} internal
 * @param {String[]} internal.existingResultOrigins
 * @param {Number} internal.notificationRtime
 * @returns {Promise<{count: Number, missedOrigins: String[]}>}
 */
export async function count (opts, {existingResultOrigins, notificationRtime} = {}) {
  if (isDisabled) return {count: 0, missedOrigins: undefined}
  
  var pathQuery = opts.path ? toArray(opts.path).map(parseSimplePathSpec) : undefined
  if (opts.origin) {
    opts.origin = toArray(opts.origin).map(origin => normalizeOrigin(origin))
  }

  var entries
  if (opts.links) {
    entries = /** @type String[]*/(await beakerNetworkIndex.backlinks.get(
      normalizeUrl(opts.links),
      {file: true}
    ))
  } else if (opts.notification) {
    entries = /** @type String[]*/(await beakerNetworkIndex.backlinks.get(
      normalizeOrigin(getProfileUrl()),
      {crtime: true}
    ))
  } else {
    entries = []
  }

  entries = entries.filter(entry => {
    var url = entry.value.source
    if (opts.notification) {
      if (isSameOrigin(getProfileUrl(), entry.value.drive)) {
        return false
      }
      if (opts.notification?.unread) {
        if (entry.value.rtime <= notificationRtime) {
          return false
        }
      }
    }
    if (pathQuery) {
      let {pathname} = parseUrl(url)
      let test = q => (
        (!q.extension || pathname.endsWith(q.extension))
        && (!q.prefix || pathname.startsWith(q.prefix + '/'))
      )
      if (!pathQuery.find(test)) {
        return false
      }
    }
    if (opts.origin) {
      if (!opts.origin.includes(normalizeOrigin(url))) {
        return false
      }
    }
    if (existingResultOrigins?.length) {
      if (existingResultOrigins.find(origin => origin === entry.value.drive)) {
        return false
      }
    }
    return true
  })
  
  return {count: entries.length, missedOrigins: undefined}
}

/**
 * @param {String} targetOrigin 
 * @param {RecordDescription[]} localSubs
 * @returns {Promise<Number>}
 */
export async function countSubscribers (targetOrigin, localSubs) {
  if (isDisabled) return undefined
  try {
    let subscriptions = await beakerNetworkIndex.subscriptions.getSubscribers(targetOrigin)
    let count = subscriptions.length

    // make sure local subs are included
    for (let localSub of localSubs) {
      if (!subscriptions.includes(localSub.site.url)) {
        count++
      }
    }

    return count
  } catch (e) {
    return undefined
  }
}

var _isProfileListedInBeakerNetworkCache = undefined
/**
 * @returns {Promise<Boolean>}
 */
export async function isProfileListedInBeakerNetwork () {
  if (typeof _isProfileListedInBeakerNetworkCache !== 'undefined') {
    return _isProfileListedInBeakerNetworkCache
  }
  var profileUrl = getProfileUrl()
  if (!profileUrl) return false
  profileUrl = normalizeOrigin(profileUrl)
  var userList = await fetchFullSitesList()
  _isProfileListedInBeakerNetworkCache = !!userList.find(user => user.url === profileUrl)
  return _isProfileListedInBeakerNetworkCache
}

/**
 * @returns {Promise<Void>}
 */
export async function addProfileToBeakerNetwork () {
  var profile = await getProfile()
  if (!profile) return
  var driveUrl = normalizeOrigin(profile.url)
  var req = await fetch('https://userlist.beakerbrowser.com/', {
    method: 'POST',
    body: JSON.stringify({
      driveUrl,
      title: profile.title,
      description: profile.description
    }),
    headers: {'Content-Type': 'application/json'}
  })
  await req.text()
  _isProfileListedInBeakerNetworkCache = true
}

// internal methods
// =

/**
 * 
 * @param {HyperbeeBacklink} backlink 
 * @param {Number} [notificationRtime]
 * @returns {Promise<RecordDescription>?}
 */
async function backlinkToRecord (backlink, notificationRtime = undefined) {
  var urlp = parseUrl(backlink.value.source)
  var [site, content] = await Promise.all([
    fullGetSite(backlink.value.drive, {cacheOnly: true}),
    // ^ use fullGetSite() since that'll hit the sqlite first, which is faster than hyperbee
    backlink.value.content ? beakerNetworkIndex.db.get(backlink.value.content) : undefined
  ])
  var notification = undefined
  if (typeof notificationRtime !== 'undefined') {
    // try to detect the link
    notification = {
      key: undefined,
      subject: undefined,
      unread: backlink.value.rtime > notificationRtime
    }
    let profileUrl = getProfileUrl()
    for (let k in backlink.value.metadata) {
      if (isSameOrigin(profileUrl, backlink.value.metadata[k])) {
        notification.key = k
        notification.subject = backlink.value.metadata[k]
        break
      }
    }
  }
  return {
    type: 'file',
    path: urlp.pathname,
    url: backlink.value.source,
    ctime: backlink.value.crtime,
    mtime: backlink.value.mrtime,
    metadata: backlink.value.metadata,
    index: {
      id: 'network',
      rtime: backlink.value.rtime,
      links: []
    },
    site: {
      url: backlink.value.drive,
      title: site.title || toNiceUrl(urlp.origin)
    },
    content: content ? content.value : undefined,
    notification
  }
}

var _fullSitesListCache = undefined
var _lastFullSiteFetch = undefined
/**
 * @returns {Promise<SiteDescription[]>}
 */
async function fetchFullSitesList () {
  if (_fullSitesListCache && (Date.now() - _lastFullSiteFetch < SITES_CACHE_TIME)) {
    return _fullSitesListCache
  }

  try {
    var json = await (await fetch('https://userlist.beakerbrowser.com/list.json')).json()
    _fullSitesListCache = []
    for (let user of json.users.sort((a, b) => b.peerCount - a.peerCount)) {
      _fullSitesListCache.push({
        origin: normalizeOrigin(user.driveUrl),
        url: normalizeOrigin(user.driveUrl),
        title: user.title || toNiceUrl(user.driveUrl),
        description: user.description || '',
        writable: Boolean((await getMeta(user.driveUrl, {noDefault: true}))?.writable),
        index: {id: 'network'},
        graph: undefined
      })
    }

    _lastFullSiteFetch = Date.now()
    return _fullSitesListCache
  } catch (e) {
    console.log('Error fetching the sites list', e)
    return []
  }
}