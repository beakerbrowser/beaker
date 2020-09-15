import BeakerIndexer from 'beaker-index'
import { dirname, extname } from 'path'
import { getHyperspaceClient } from '../hyper/daemon'
import { normalizeOrigin, normalizeUrl, isSameOrigin } from '../../lib/urls'
import { parseSimplePathSpec } from '../../lib/strings'
import {
  toArray,
  parseUrl
} from './util'
import { getSite as fullGetSite } from './index'
import { getProfileUrl } from '../filesystem/index'

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

// exported api
// =

export async function setup () {
  var client = getHyperspaceClient()
  beakerNetworkIndex = new BeakerIndexer(client.corestore(), client.network, BEAKER_NETWORK_INDEX_KEY)
  await beakerNetworkIndex.ready()
}

/**
 * @param {String} url 
 * @returns {Promise<SiteDescription>}
 */
export async function getSite (url) {
  var origin = normalizeOrigin(url)
  if (!origin.startsWith('hyper://')) return undefined // hyper only for now
  var indexJson = await beakerNetworkIndex.drives.get(origin)
  if (indexJson) {
    return {
      origin: origin,
      url: origin,
      title: indexJson.title || origin,
      description: indexJson.description || '',
      writable: false
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
      if (existingResultOrigins.find(res => res.url === entry.value.drive)) {
        return false
      }
    }
    return true
  })
  
  return {count: entries.length, missedOrigins: undefined}
}

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
  if (notificationRtime) {
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
      id: 'userlist.beakerbrowser.com',
      rtime: backlink.value.rtime,
      links: []
    },
    site: {
      url: backlink.value.drive,
      title: site.title
    },
    content: content ? content.value : undefined,
    notification
  }
}