import EventEmitter from 'events'
import pump from 'pump'
import concat from 'concat-stream'
import * as db from '../dbs/profile-data-db'
import knex from '../lib/knex'
import { join as joinPath } from 'path'

// typedefs
// =

/**
 * @typedef {import('../dat/daemon').DaemonDatArchive} DaemonDatArchive
 *
 * @typedef {Object} CrawlSourceRecord
 * @prop {string} id
 * @prop {string} url
 * @prop {number} datDnsId
 * @prop {boolean} globalResetRequired
 */

// exported api
// =

const uwgEvents = new EventEmitter()
export { uwgEvents }

/**
 * @param {DaemonDatArchive} archive
 * @param {CrawlSourceRecord} crawlSource
 * @param {string} crawlDataset
 * @param {number} crawlDatasetVersion
 * @param {function(Object): Promise<void>} handlerFn
 * @returns {Promise}
 */
export async function doCrawl (archive, crawlSource, crawlDataset, crawlDatasetVersion, handlerFn) {
  const url = archive.url

  // fetch current crawl state
  var resetRequired = false
  var state = await db.get(
    knex('crawl_sources_meta')
      .select('crawl_sources_meta.*')
      .where({crawlSourceId: crawlSource.id, crawlDataset})
  )
  if (crawlSource.globalResetRequired || (state && state.crawlDatasetVersion !== crawlDatasetVersion)) {
    resetRequired = true
    state = null
  }
  if (!state) {
    state = {crawlSourceVersion: 0, crawlDatasetVersion}
  }

  // fetch current archive version
  var archiveInfo = await archive.getInfo()
  var version = archiveInfo ? archiveInfo.version : 0

  // fetch change log
  var changes
  var start = state.crawlSourceVersion
  var end = version
  if (start === end) {
    changes = []
  } else {
    let stream = await archive.session.drive.createDiffStream(start, '/')
    changes = await new Promise((resolve, reject) => {
      pump(stream, concat({encoding: 'object'}, resolve), reject)
    })
  }

  changes.forEach(c => {
    if (!c.name.startsWith('/')) {
      c.name = '/' + c.name
    }

    // TEMPORARY
    // createDiffStream() doesnt include a .version
    // we need an accurate version to checkpoint progress
    // for now, use the earliest version
    // -prf
    c.version = version
  })

  uwgEvents.emit('crawl-dataset-start', {sourceUrl: archive.url, crawlDataset, crawlRange: {start, end}})

  // handle changes
  await handlerFn({changes, resetRequired})

  // final checkpoint
  await doCheckpoint(crawlDataset, crawlDatasetVersion, crawlSource, version)

  uwgEvents.emit('crawl-dataset-finish', {sourceUrl: archive.url, crawlDataset, crawlRange: {start, end}})
};

/**
 * @param {string} crawlDataset
 * @param {number} crawlDatasetVersion
 * @param {CrawlSourceRecord} crawlSource
 * @param {number} crawlSourceVersion
 * @returns {Promise}
 */
export async function doCheckpoint (crawlDataset, crawlDatasetVersion, crawlSource, crawlSourceVersion) {
  // TODO chould this be an INSERT OR REPLACE?
  await db.run(knex('crawl_sources_meta').delete().where({crawlDataset, crawlSourceId: crawlSource.id}))
  await db.run(knex('crawl_sources_meta').insert({
    crawlDataset,
    crawlDatasetVersion,
    crawlSourceId: crawlSource.id,
    crawlSourceVersion,
    updatedAt: Date.now()
  }))
}

/**
 * @param {string} sourceUrl
 * @param {string} crawlDataset
 * @param {number} progress
 * @param {number} numUpdates
 */
export function emitProgressEvent (sourceUrl, crawlDataset, progress, numUpdates) {
  uwgEvents.emit('crawl-dataset-progress', {sourceUrl, crawlDataset, progress, numUpdates})
};

/**
 * @param {Array<Object>} changes
 * @param {RegExp} regex
 * @returns {Array<Object>}
 */
export function getMatchingChangesInOrder (changes, regex) {
  var list = []
  list = changes.filter(c => regex.test(c.name))
  list.sort((a, b) => a.version - b.version) // order matters, must be oldest to newest
  return list
};

/**
 * @returns {string}
 */
var _lastGeneratedTimeFilename

export function generateTimeFilename () {
  var d = Date.now()
  if (d === _lastGeneratedTimeFilename) {
    d++
  }
  _lastGeneratedTimeFilename = d
  return (new Date(d)).toISOString()
};

/**
 * @param {string} url
 * @returns {string}
 */
export function toHostname (url) {
  var urlParsed = new URL(url)
  return urlParsed.hostname
}

/**
 * @param {string} url
 * @param {boolean?} shouldThrow
 * @returns {string}
 */
export function toOrigin (url, shouldThrow = false) {
  try {
    var urlParsed = new URL(url)
    return urlParsed.protocol + '//' + urlParsed.hostname
  } catch (e) {
    if (shouldThrow) {
      throw new Error('Invalid URL: ' + url)
    }
    return null
  }
}

/**
 * @param {string} url
 * @returns {string}
 */
export function normalizeTopicUrl (url) {
  try {
    var urlp = new URL(url)
    return (urlp.protocol + '//' + urlp.hostname + urlp.pathname + urlp.search + urlp.hash).replace(/([/]$)/g, '')
  } catch (e) {}
  return null
};

/**
 * @param {string} url
 * @returns {string}
 */
export function normalizeSchemaUrl (url) {
  try {
    var urlp = new URL(url)
    return (urlp.hostname + urlp.pathname + urlp.search + urlp.hash).replace(/([/]$)/g, '')
  } catch (e) {}
  return url
};

/**
 * @param {DaemonDatArchive} archive
 * @param {string} pathname
 * @returns {Promise}
 */
export async function ensureDirectory (archive, pathname) {
  var acc = ''
  var parts = pathname.split('/').filter(Boolean)
  for (let p of parts) {
    acc = joinPath(acc, p)
    await archive.pda.mkdir(acc).catch(err => null)
  }
};

/**
 * @description Helper to determine the thumbUrl for a site description.
 * @param {string} author - (URL) the author of the site description.
 * @param {string} subject - (URL) the site being described.
 * @returns {string} - the URL of the thumbnail.
 */
export function getSiteDescriptionThumbnailUrl (author, subject) {
  return author === subject
    ? `${subject}/thumb` // self-description, use their own thumb
    : `${author}/data/known-sites/${toHostname(subject)}/thumb` // use captured thumb
};

/**
 * @param {string} url
 * @returns {string}
 */
var reservedChars = /[<>:"/\\|?*\x00-\x1F]/g
var endingDashes = /([-]+$)/g

export function slugifyUrl (str) {
  try {
    let url = new URL(str)
    str = url.protocol + url.hostname + url.pathname + url.search + url.hash
  } catch (e) {
    // ignore
  }
  return str.replace(reservedChars, '-').replace(endingDashes, '')
};