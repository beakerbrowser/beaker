import { joinPath, slugify } from '../../lib/strings.js'
import { query } from './query.js'
import * as filesystem from './index'
import { URL } from 'url'

// exported
// =

/**
 * @returns {Promise<Object>}
 */
export async function list () {
  var files = (await query({
    path: '/library/bookmarks/*.goto',
  }))
  return files.map(massageBookmark)
}

/**
 * @param {string} href
 * @returns {Promise<Object>}
 */
export async function get (href) {
  var file = (await query({
    path: '/library/bookmarks/*.goto',
    metadata: {href}
  }))[0]
  if (!file) return null
  return massageBookmark(file)  
}

/**
 * @param {Object} bookmark
 * @param {string} bookmark.location
 * @param {string} bookmark.href
 * @param {string} bookmark.title
 * @returns {Promise<string>}
 */
export async function add ({location, href, title}) {
  location = location || '/library/bookmarks'
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
  slug = slug.toLowerCase()

  var filename = await filesystem.getAvailableName(location, slug, 'goto') // avoid collisions
  var path = joinPath(location, filename)
  await filesystem.get().pda.writeFile(path, '', {metadata: {href, title}})
  return path
}

/**
 * @param {string} oldHref
 * @param {Object} bookmark
 * @param {string} [bookmark.href]
 * @param {string} [bookmark.title]
 * @param {string} [bookmark.description]
 * @param {boolean} [bookmark.isPublic]
 * @returns {Promise<string>}
 */
export async function update (oldHref, {href, title, description, isPublic}) {
  return // TODO - is this function needed?

  // read existing
  var oldBookmark = await get(oldHref)
  if (!oldBookmark) return add({href, title, description, isPublic})

  var slug = slugify(href || oldBookmark.href)
  var path = isPublic ? `/profile/data/unwalled.garden/bookmarks/${slug}.json` : `/data/unwalled.garden/bookmarks/${slug}.json`

  // remove old if changing isPublic
  if (typeof isPublic !== 'undefined' && oldBookmark.isPublic !== isPublic) {
    try {
      let oldSlug = slugify(oldBookmark.href)
      let oldPath = oldBookmark.isPublic ? `/profile/data/unwalled.garden/bookmarks/${oldSlug}.json` : `/data/unwalled.garden/bookmarks/${oldSlug}.json`
      await filesystem.get().pda.unlink(oldPath)
    } catch (e) {
      // ignore
    }
  }

  // write new
  await filesystem.get().pda.writeFile(path, JSON.stringify({
    type: 'unwalled.garden/bookmark',
    href: typeof href === 'string' ? href : oldBookmark.href,
    title: typeof title === 'string' ? title : oldBookmark.title,
    description: typeof description === 'string' ? description : oldBookmark.description,
    createdAt: oldBookmark.createdAt || (new Date()).toISOString(),
    updatedAt: (new Date()).toISOString()
  }, null, 2))

  return path
}

/**
 * @param {string} href
 * @returns {Promise<void>}
 */
export async function remove (href) {
  return // TODO - is this function needed?
  var oldBookmark = await get(href)
  if (!oldBookmark) return

  let slug = slugify(oldBookmark.href)
  let path = oldBookmark.isPublic ? `/profile/data/unwalled.garden/bookmarks/${slug}.json` : `/data/unwalled.garden/bookmarks/${slug}.json`
  await filesystem.get().pda.unlink(path)
}

// internal
// =

function massageBookmark (file) {
  return {
    href: file.stat.metadata.href,
    title: file.stat.metadata.title || file.stat.metadata.href
  }
}