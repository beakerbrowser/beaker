import { joinPath, slugify } from '../../lib/strings.js'
import * as drives from '../hyper/drives'
import * as indexer from '../indexer/index'
import { INDEX_IDS, METADATA_KEYS } from '../indexer/const'
import * as filesystem from './index'
import { URL } from 'url'
import * as profileDb from '../dbs/profile-data-db'

// exported
// =

/**
 * @returns {Promise<Object>}
 */
export async function list () {
  var results = await indexer.list({
    filter: {
      index: INDEX_IDS.bookmarks,
      site: ['hyper://private', filesystem.getProfileUrl()]
    },
    limit: 1e9
  })
  return results.map(massageBookmark)
}

/**
 * @param {string} href
 * @returns {Promise<Object>}
 */
export async function get (href) {
  href = normalizeUrl(href)
  var results = await indexer.list({
    filter: {
      index: INDEX_IDS.bookmarks,
      site: ['hyper://private', filesystem.getProfileUrl()],
      linksTo: href
    },
    limit: 1e9
  })
  if (results[0]) {
    return massageBookmark(results[0])
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
      [METADATA_KEYS.pinned]: pinned ? '1' : undefined
    })
    let keysToDelete = ['href', 'title', 'pinned'] // delete legacy
    if (!pinned) keysToDelete.push(METADATA_KEYS.pinned) // delete pinned to remove
    await drive.pda.deleteMetadata(urlp.pathname, keysToDelete)
    await indexer.triggerSiteIndex(site)
    return
  }

  // new bookmark
  var slug = createBookmarkSlug(href, title)
  var filename = await filesystem.getAvailableName('/bookmarks', slug, 'goto', drive) // avoid collisions
  var path = joinPath('/bookmarks', filename)
  await filesystem.ensureDir('/bookmarks', drive)
  await drive.pda.writeFile(path, '', {metadata: {
    [METADATA_KEYS.href]: href,
    [METADATA_KEYS.title]: title,
    [METADATA_KEYS.pinned]: pinned ? '1' : undefined
  }})
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

function massageBookmark (result) {
  return {
    bookmarkUrl: result.url,
    href: normalizeUrl(result.metadata.href),
    title: result.metadata.title || result.metadata.href,
    pinned: result.metadata['beaker/pinned'] === '1',
    site: result.site
  }
}

function normalizeUrl (url) {
  try {
    var urlp = new URL(url)
    return (urlp.protocol + '//' + urlp.hostname + (urlp.port ? `:${urlp.port}` : '') + urlp.pathname).replace(/([/]$)/g, '')
  } catch (e) {}
  return url
}

var indexFileRe = /\/(index\.(htm|html|md))?$/i
function isSameUrl (a, b) {
  if (a === b) return true
  return a.replace(indexFileRe, '') === b.replace(indexFileRe, '')
}

function createBookmarkSlug (href, title) {
  var slug
  try {
    var hrefp = new URL(href)
    if (hrefp.pathname === '/' && !hrefp.search && !hrefp.hash) {
      // at the root path - use the hostname for the filename
      slug = slugify(hrefp.hostname)
    } else if (typeof title === 'string' && !!title.trim()) {
      // use the title if available on subpages
      slug = slugify(title.trim())
    } else {
      // use parts of the url
      slug = slugify(hrefp.hostname + hrefp.pathname + hrefp.search + hrefp.hash)
    }
  } catch (e) {
    // weird URL, just use slugified version of it
    slug = slugify(href)
  }
  return slug.toLowerCase()
}