import BeakerIndexer from 'beaker-index'
import { dirname, extname } from 'path'
import { getHyperspaceClient } from '../hyper/daemon'
import { normalizeOrigin, normalizeUrl } from '../../lib/urls'
import {
  toFileQuery,
  toArray,
  parseUrl
} from './util'
import { getSite } from './index'
import { getProfileUrl } from '../filesystem/index'

const BEAKER_NETWORK_INDEX_KEY = '146100706d88c6ca4ee01fe759a2f154a7be23705a212435efaf2c12e1e5d18d' // TODO fetch from endpoint

/**
 * @typedef {import('./const').Site} Site
 * @typedef {import('./const').SiteDescription} SiteDescription
 * @typedef {import('./const').RecordUpdate} RecordUpdate
 * @typedef {import('./const').ParsedUrl} ParsedUrl
 * @typedef {import('./const').RecordDescription} RecordDescription
 * @typedef {import('../filesystem/query').FSQueryResult} FSQueryResult
 * @typedef {import('./const').FileQuery} FileQuery
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
 * @param {Object} opts
 * @param {String|String[]} [opts.site]
 * @param {FileQuery|FileQuery[]} [opts.file]
 * @param {String} [opts.links]
 * @param {Boolean|NotificationQuery} [opts.notification]
 * @param {String|String[]} [opts.index] - 'local' or 'network'
 * @param {String} [opts.sort]
 * @param {Number} [opts.offset]
 * @param {Number} [opts.limit]
 * @param {Boolean} [opts.reverse]
 * @param {RecordDescription[]} [existingResults]
 * @returns {Promise<{records: RecordDescription[], missedOrigins: String[]}>}
 */
export async function listRecords (opts, existingResults) {
  var fileQuery = opts.file ? toArray(opts.file).map(toFileQuery) : undefined
  if (opts.site) {
    opts.site = toArray(opts.site).map(origin => normalizeOrigin(origin))
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
      backlinksOpts.limit = opts.limit
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
    if (fileQuery) {
      let {pathname} = parseUrl(url)
      let test = q => (
        (!q.extension || pathname.endsWith(q.extension))
        && (!q.prefix || pathname.startsWith(q.prefix + '/'))
      )
      if (!fileQuery.find(test)) {
        return false
      }
    }
    if (opts.site) {
      if (!opts.site.includes(normalizeOrigin(url))) {
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

  var records = await Promise.all(entries.map(backlinkToRecord))
  records.sort((a, b) => {
    if (opts.sort === 'ctime') {
      return opts.reverse ? (b.ctime - a.ctime) : (a.ctime - b.ctime)
    } else if (opts.sort === 'mtime') {
      return opts.reverse ? (b.mtime - a.mtime) : (a.mtime - b.mtime)
    } else if (opts.sort === 'crtime') {
      let crtimeA = Math.min(a.ctime, a.rtime)
      let crtimeB = Math.min(b.ctime, b.rtime)
      return opts.reverse ? (crtimeB - crtimeA) : (crtimeA - crtimeB)
    } else if (opts.sort === 'mrtime') {
      let mrtimeA = Math.min(a.mtime, a.rtime)
      let mrtimeB = Math.min(b.mtime, b.rtime)
      return opts.reverse ? (mrtimeB - mrtimeA) : (mrtimeA - mrtimeB)
    } else if (opts.sort === 'site') {
      return b.site.url.localeCompare(a.site.url) * (opts.reverse ? -1 : 1)
    }
  })

  return {records, missedOrigins: undefined}
}

/**
 * @param {Object} [opts]
 * @param {String|Array<String>} [opts.site]
 * @param {FileQuery|Array<FileQuery>} [opts.file]
 * @param {String} [opts.links]
 * @param {Boolean|NotificationQuery} [opts.notification]
 * @returns {Promise<{count: Number, missedOrigins: String[]}>}
 */
export async function countRecords (opts, existingResultOrigins) {
  var fileQuery = opts.file ? toArray(opts.file).map(toFileQuery) : undefined
  if (opts.site) {
    opts.site = toArray(opts.site).map(origin => normalizeOrigin(origin))
  }

  var entries
  if (opts.links) {
    entries = /** @type String[]*/(await beakerNetworkIndex.backlinks.get(
      normalizeUrl(opts.links),
      {file: true}
    ))
  } else if (opts.notification) {
    entries = /** @type String[]*/(await beakerNetworkIndex.backlinks.get(
      normalizeOrigin(getProfileUrl())
    ))
  } else {
    entries = []
  }

  entries = entries.filter(entry => {
    var url = entry.value.source
    if (fileQuery) {
      let {pathname} = parseUrl(url)
      let test = q => (
        (!q.extension || pathname.endsWith(q.extension))
        && (!q.prefix || pathname.startsWith(q.prefix + '/'))
      )
      if (!fileQuery.find(test)) {
        return false
      }
    }
    if (opts.site) {
      if (!opts.site.includes(normalizeOrigin(url))) {
        return false
      }
    }
    if (existingResultOrigins?.length) {
      if (existingResultOrigins.find(res => res.url === url)) {
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
 * @returns {Promise<RecordDescription>?}
 */
async function backlinkToRecord (backlink) {
  var urlp = parseUrl(backlink.value.source)
  var site = await getSite(backlink.value.drive, {cacheOnly: true})
  return {
    url: backlink.value.source,
    prefix: dirname(urlp.pathname),
    extension: extname(urlp.pathname),
    ctime: backlink.value.crtime,
    mtime: backlink.value.mrtime,
    rtime: backlink.value.rtime,
    site: {
      url: backlink.value.drive,
      title: site.title
    },
    metadata: backlink.value.metadata,
    links: [],
    content: undefined
  }
}