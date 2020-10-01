import { joinPath } from '../../lib/strings.js'
import { normalizeUrl, createResourceSlug } from '../../lib/urls'
import * as drives from '../hyper/drives'
import * as indexer from '../indexer/index'
import { METADATA_KEYS } from '../indexer/const'
import * as filesystem from './index'
import * as pinsAPI from './pins'
import { URL } from 'url'
import * as profileDb from '../dbs/profile-data-db'

// exported
// =

/**
 * @returns {Promise<Object>}
 */
export async function list () {
  var {records} = await indexer.gql(`
    records (
      paths: ["/bookmarks/*.goto"]
      origins: ["hyper://private", "${filesystem.getProfileUrl()}"]
    ) {
      url
      metadata
      site {
        url
        title
        description
      }
    }
  `)
  var pins = await pinsAPI.getCurrent()
  return records.map(r => massageBookmark(r, pins))
}

/**
 * @param {string} href
 * @returns {Promise<Object>}
 */
export async function get (href) {
  href = normalizeUrl(href)
  var {records} = await indexer.gql(`
    records (
      paths: ["/bookmarks/*.goto"]
      origins: ["hyper://private", "${filesystem.getProfileUrl()}"]
      links: {url: "${href}"}
      limit: 1
    ) {
      url
      metadata
      site {
        url
        title
        description
      }
    }
  `)
  if (records[0]) {
    var pins = await pinsAPI.getCurrent()
    return massageBookmark(records[0], pins)
  }
}

/**
 * @param {Object} bookmark
 * @param {string} bookmark.href
 * @param {string} bookmark.title
 * @param {Boolean} bookmark.pinned
 * @param {String|Object} bookmark.site
 * @returns {Promise<string>}
 */
export async function add ({href, title, pinned, site}) {
  href = normalizeUrl(href)
  site = site || 'hyper://private'
  if (typeof site === 'object' && site.url) {
    site = site.url
  }
  var drive = await drives.getOrLoadDrive(site)

  let existing = await get(href)
  if (existing) {
    if (typeof title === 'undefined') title = existing.title
    if (typeof pinned === 'undefined') pinned = existing.pinned
    if (normalizeUrl(existing.site.url) !== normalizeUrl(site)) {
      // site change, have to remove and add
      await remove(href)
      return add({href, title, pinned, site})
    }

    // same site, just update metadata
    let urlp = new URL(existing.bookmarkUrl)
    await drive.pda.updateMetadata(urlp.pathname, {
      [METADATA_KEYS.href]: href,
      [METADATA_KEYS.title]: title,
    })
    await indexer.triggerSiteIndex(site)
    if (pinned !== existing.pinned) {
      if (pinned) await pinsAPI.add(href)
      else await pinsAPI.remove(href)
    }
    return
  }

  // new bookmark
  var slug = createResourceSlug(href, title)
  var filename = await filesystem.getAvailableName('/bookmarks', slug, 'goto', drive) // avoid collisions
  var path = joinPath('/bookmarks', filename)
  await filesystem.ensureDir('/bookmarks', drive)
  await drive.pda.writeFile(path, '', {metadata: {
    [METADATA_KEYS.href]: href,
    [METADATA_KEYS.title]: title
  }})
  if (pinned) await pinsAPI.add(href)
  await indexer.triggerSiteIndex(site)
  return path
}

/**
 * @param {string} href
 * @returns {Promise<void>}
 */
export async function remove (href) {
  let existing = await get(href)
  if (!existing) return
  let urlp = new URL(existing.bookmarkUrl)
  let drive = await drives.getOrLoadDrive(urlp.hostname)
  await drive.pda.unlink(urlp.pathname)
  if (existing.pinned) await pinsAPI.remove(existing.href)
  await indexer.triggerSiteIndex(urlp.hostname)
}

export async function migrateBookmarksFromSqlite () {
  var bookmarks = await profileDb.all(`SELECT * FROM bookmarks`)
  for (let bookmark of bookmarks) {
    await add({
      href: bookmark.url,
      title: bookmark.title,
      pinned: false, // pinned: bookmark.pinned - DONT migrate this because 0.8 pinned bookmarks are often dat://
      site: 'hyper://private'
    })
  }
}

// internal
// =

function massageBookmark (result, pins) {
  let href = normalizeUrl(result.metadata[METADATA_KEYS.href]) || ''
  return {
    bookmarkUrl: result.url,
    href,
    title: result.metadata[METADATA_KEYS.title] || result.metadata[METADATA_KEYS.href] || '',
    pinned: pins.includes(href),
    site: result.site
  }
}