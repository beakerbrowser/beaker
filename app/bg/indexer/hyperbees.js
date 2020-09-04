import BeakerIndexer from 'beaker-index'
import { getHyperspaceClient } from '../hyper/daemon'
import { normalizeOrigin, normalizeUrl } from '../../lib/urls'
import {
  toFileQuery,
  toArray,
  parseUrl
} from './util'
import { getRecord } from './index'

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

  var urls
  if (opts.links) {
    urls = /** @type String[]*/(await beakerNetworkIndex.backlinks.getBacklinks(normalizeUrl(opts.links)))
    urls = urls.filter(url => {
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
  } else {
    urls = []
  }

  var records = await Promise.all(urls.map(url => getRecord(url)))
  records = records.filter(Boolean)
  records.sort((a, b) => {
    if (opts.sort === 'ctime') {
      return opts.reverse ? (b.ctime - a.ctime) : (a.ctime - b.ctime)
    } else if (opts.sort === 'mtime') {
      return opts.reverse ? (b.mtime - a.mtime) : (a.mtime - b.mtime)
    } else if (opts.sort === 'site') {
      return b.site.url.localeCompare(a.site.url) * (opts.reverse ? -1 : 1)
    }
  })
  records = records.slice(opts.offset, opts.offset + opts.limit)

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

  var urls
  if (opts.links) {
    urls = /** @type String[]*/(await beakerNetworkIndex.backlinks.getBacklinks(normalizeUrl(opts.links)))
    urls = urls.filter(url => {
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
  } else {
    urls = []
  }
  
  return {count: urls.length, missedOrigins: undefined}
}