import BeakerIndexer from 'beaker-index'
import fetch from 'node-fetch'
import markdownLinkExtractor from 'markdown-link-extractor'
import { DRIVE_KEY_REGEX, parseSimplePathSpec, toNiceUrl } from '../../lib/strings'
import { isSameOrigin, normalizeOrigin, normalizeUrl, isUrlLike } from '../../lib/urls'
import { getMeta } from '../dbs/archives'
import * as settingsDb from '../dbs/settings'
import { getProfile, getProfileUrl } from '../filesystem/index'
import { getHyperspaceClient } from '../hyper/daemon'
import { getSite as fullGetSite } from './index'
import { parseUrl, toArray } from './util'

const SITES_CACHE_TIME = 60e3 * 5 // 5 minutes
const BEAKER_NETWORK_INDEX_KEY = '1332bcbf73d119399518adf3c4d5c9dbcf9d91d5d3a6c922296b539cfe7de381'

/**
 * @typedef {import('./const').Site} Site
 * @typedef {import('./const').SiteDescription} SiteDescription
 * @typedef {import('./const').RecordUpdate} RecordUpdate
 * @typedef {import('./const').ParsedUrl} ParsedUrl
 * @typedef {import('./const').LinkQuery} LinkQuery
 * @typedef {import('./const').RangeQuery} RangeQuery
 * @typedef {import('./const').RecordDescription} RecordDescription
 * @typedef {import('../filesystem/query').FSQueryResult} FSQueryResult
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
      index: 'network'
    }
  }
}

/**
 * @param {Object} opts
 * @param {Object} etc
 * @returns {Promise<{records: RecordDescription[], missedOrigins: String[]}>}
 */
export async function query (opts, etc) {
  if (isDisabled) return {records: [], missedOrigins: undefined}
  var entries = await queryInner(opts, etc)
  var records = entries.map(entry => backlinkToRecord(entry))
  return {records, missedOrigins: undefined}
}

/**
 * @param {Object} opts
 * @param {Object} etc
 * @returns {Promise<{count: Number, missedOrigins: String[]}>}
 */
export async function count (opts, etc) {
  if (isDisabled) return {count: 0, missedOrigins: undefined}
  var entries = await queryInner(opts, etc)
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
 * @param {Object} opts
 * @param {String[]} [opts.origins]
 * @param {String[]} [opts.excludeOrigins]
 * @param {String[]} [opts.paths]
 * @param {LinkQuery} [opts.links]
 * @param {RangeQuery} [opts.before]
 * @param {RangeQuery} [opts.after]
 * @param {String} [opts.sort]
 * @param {Number} [opts.offset]
 * @param {Number} [opts.limit]
 * @param {Boolean} [opts.reverse]
 * @param {Object} [etc]
 * @param {RecordDescription[]} [etc.existingResults]
 * @param {String[]} [etc.existingResultOrigins]
 * @returns {Promise<HyperbeeBacklink[]>}
 */
async function queryInner (opts, {existingResults, existingResultOrigins} = {}) {
  var pathQuery = opts.paths ? toArray(opts.paths).map(parseSimplePathSpec) : undefined
  var linkPathQuery
  if (opts.links?.paths?.length > 1 || opts.links?.paths?.[0].includes('*')) {
    // we only need linkPathQuery if it there are multiple or if it's a path query
    linkPathQuery = opts.links.paths.map(str => str.includes('*') ? parseSimplePathSpec(str) : str)
  }

  var entries
  if (opts.links && opts.links.origin) {
    let backlinksOpts = {}
    let url = opts.links.origin
    let isPresorted = false
    if (opts.links.paths?.length === 1 && !linkPathQuery && opts.links.paths[0] !== '/') {
      backlinksOpts.file = true
      url = opts.links.origin + opts.links.paths[0]
    } else if (opts.sort === 'mtime' || opts.sort === 'mrtime') {
      backlinksOpts.mrtime = true
      isPresorted = true
    } else if (opts.sort === 'ctime' || opts.sort === 'crtime') {
      backlinksOpts.crtime = true
      isPresorted = true
    }
    // HACK since we have to manually sort, don't apply a limit
    // if (isPresorted && typeof opts.limit === 'number') {
    //   backlinksOpts.limit = opts.limit
    // }
    if (isPresorted && typeof opts.reverse === 'boolean') {
      backlinksOpts.reverse = opts.reverse
    }
    entries = /** @type HyperbeeBacklink[]*/(await beakerNetworkIndex.backlinks.get(
      url,
      backlinksOpts
    ))
  } else {
    // for now, we only support specific backlink queries
    return []
  }

  entries = entries.filter(entry => {
    var url = entry.value.source
    let {origin, pathname} = parseUrl(url)
    if (pathQuery) {
      let test = q => (
        (!q.extension || pathname.endsWith(q.extension))
        && (!q.prefix || pathname.startsWith(q.prefix + '/'))
      )
      if (!pathQuery.find(test)) {
        return false
      }
    }
    if (linkPathQuery) {
      let href = entry.value.metadata?.href
      if (!href || typeof href !== 'string') return false
      let hrefp
      try { hrefp = parseUrl(href) }
      catch (e) {
        console.log(href, e) // TODO removeme
        return false
      }
      for (let q of linkPathQuery) {
        if (typeof q === 'string') {
          if (hrefp.path !== q) return false
        } else {
          if (q.extension && !hrefp.path.endsWith(q.extension)) return false
          if (q.prefix && !hrefp.path.startsWith(q.prefix + '/')) return false
        }
      }
    }
    if (opts.origins && !opts.origins.includes(origin)) {
      return false
    }
    if (opts.excludeOrigins && opts.excludeOrigins.includes(origin)) {
      return false
    }
    if (opts.before) {
      let v = entry.value[rangeSortKeyToHyperbeeKey(opts.before.key)]
      if (!v) return false
      if (opts.before.inclusive) {
        if (v > opts.before.value) return false
      } else {
        if (v >= opts.before.value) return false
      }
    }
    if (opts.after) {
      let v = entry.value[rangeSortKeyToHyperbeeKey(opts.after.key)]
      if (!v) return false
      if (opts.after.inclusive) {
        if (v < opts.after.value) return false
      } else {
        if (v <= opts.after.value) return false
      }
    }
    if (existingResults?.length) {
      if (existingResults.find(res => res.url === url)) {
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

  return entries
}

/**
 * 
 * @param {HyperbeeBacklink} backlink 
 * @returns {RecordDescription}
 */
function backlinkToRecord (backlink) {
  var urlp = parseUrl(backlink.value.source)
  var links = []
  for (let k in backlink.value.metadata) {
    if (isUrlLike(backlink.value.metadata[k])) {
      try {
        let urlp = parseUrl(normalizeUrl(backlink.value.metadata[k]), backlink.value.drive)
        links.push({
          source: `metadata:${k}`,
          url: urlp.origin + urlp.path,
          origin: urlp.origin,
          path: urlp.path
        })
      } catch {}
    }
  }
  return {
    type: 'file',
    path: urlp.pathname,
    url: backlink.value.source,
    ctime: backlink.value.crtime,
    mtime: backlink.value.mrtime,
    rtime: backlink.value.rtime,
    metadata: backlink.value.metadata,
    index: 'network',
    links,
    content: undefined,
    async fetchData () {
      this.content = backlink.value.content ? (await beakerNetworkIndex.db.get(backlink.value.content)).value : undefined
      if (urlp.pathname.endsWith('.md')) {
        for (let addedLink of markdownLinkExtractor(this.content)) {
          try {
            let urlp = parseUrl(normalizeUrl(addedLink), backlink.value.drive)
            this.links.push({
              source: 'content',
              url: urlp.origin + urlp.path,
              origin: urlp.origin,
              path: urlp.path
            })
          } catch {}
        }
      }
    }
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
        index: 'network'
      })
    }

    _lastFullSiteFetch = Date.now()
    return _fullSitesListCache
  } catch (e) {
    console.log('Error fetching the sites list', e)
    return []
  }
}

function rangeSortKeyToHyperbeeKey (k) {
  if (k === 'mtime') return 'mrtime'
  if (k === 'ctime') return 'crtime'
  return k
}