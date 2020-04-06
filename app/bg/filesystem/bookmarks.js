import { joinPath, slugify } from '../../lib/strings.js'
import { query } from './query.js'
import * as filesystem from './index'
import { URL } from 'url'
import * as profileDb from '../dbs/profile-data-db'

// exported
// =

/**
 * @returns {Promise<Object>}
 */
export async function list () {
  var files = (await query(filesystem.get(), {
    path: '/bookmarks/*.goto'
  }))
  return files.map(massageBookmark)
}

/**
 * @param {string} href
 * @returns {Promise<Object>}
 */
export async function get (href) {
  href = normalizeUrl(href)
  var bookmarks = await list()
  return bookmarks.find(b => isSameUrl(b.href, href))
}

/**
 * @param {Object} bookmark
 * @param {string} bookmark.href
 * @param {string} bookmark.title
 * @param {Boolean} bookmark.pinned
 * @returns {Promise<string>}
 */
export async function add ({href, title, pinned}) {
  var slug
  href = normalizeUrl(href)
  
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
  slug = slug.toLowerCase()

  await remove(href) // in case this is an edit

  var filename = await filesystem.getAvailableName('/bookmarks', slug, 'goto') // avoid collisions
  var path = joinPath('/bookmarks', filename)
  await filesystem.get().pda.writeFile(path, '', {metadata: {href, title, pinned: pinned ? '1' : undefined}})
  return path
}

/**
 * @param {string} href
 * @returns {Promise<void>}
 */
export async function remove (href) {
  href = normalizeUrl(href)
  var file = (await query(filesystem.get(), {
    path: '/bookmarks/*.goto',
    metadata: {href}
  }))[0]
  if (!file) return
  await filesystem.get().pda.unlink(file.path)
}

export async function migrateBookmarksFromSqlite () {
  var bookmarks = await profileDb.all(`SELECT * FROM bookmarks`)
  for (let bookmark of bookmarks) {
    await add({
      href: bookmark.url,
      title: bookmark.title,
      pinned: false // pinned: bookmark.pinned - DONT migrate this because 0.8 pinned bookmarks are often dat://
    })
  }
}

// internal
// =

function massageBookmark (file) {
  return {
    href: normalizeUrl(file.stat.metadata.href),
    title: file.stat.metadata.title || file.stat.metadata.href,
    pinned: !!file.stat.metadata.pinned
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