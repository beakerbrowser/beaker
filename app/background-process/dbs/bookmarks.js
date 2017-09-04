/*
LEGACY
This will be replaced by the Profiles Injest DB
But currently Injest doesnt have a way to do private records
So this is used for the private bookmarks
-prf
*/

import * as db from './profile-data-db'
import normalizeUrl from 'normalize-url'
import lock from '../../lib/lock'

const NORMALIZE_OPTS = {
  stripFragment: false,
  stripWWW: false,
  removeQueryParameters: false
}

// exported methods
// =

export async function bookmark (profileId, url, {title, tags, notes}) {
  tags = tagsToString(tags)
  var release = await lock(`bookmark:${url}`)
  try {
    // read old bookmark and fallback to old values as needed
    var oldBookmark = await db.get(`SELECT url, title, pinned FROM bookmarks WHERE profileId = ? AND url = ?`, [profileId, url])
    oldBookmark = oldBookmark || {}
    const pinned = oldBookmark.pinned ? 1 : 0
    title = typeof title === 'undefined' ? oldBookmark.title : title
    tags  = typeof tags  === 'undefined' ? oldBookmark.tags  : tags
    notes = typeof notes === 'undefined' ? oldBookmark.notes : notes

    // update record
    return db.run(`
      INSERT OR REPLACE
        INTO bookmarks (profileId, url, title, tags, notes, pinned)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [profileId, url, title, tags, notes, pinned])
  } finally {
    release()
  }
}

export function unbookmark (profileId, url) {
  return db.run(`DELETE FROM bookmarks WHERE profileId = ? AND url = ?`, [profileId, url])
}

export function setBookmarkPinned (profileId, url, pinned) {
  return db.run(`UPDATE bookmarks SET pinned = ? WHERE profileId = ? AND url = ?`, [pinned ? 1 : 0, profileId, url])
}

export async function getBookmark (profileId, url) {
  return toNewFormat(await db.get(`SELECT url, title, tags, notes, pinned, createdAt FROM bookmarks WHERE profileId = ? AND url = ?`, [profileId, url]))
}

export async function listBookmarks (profileId, {tag} = {}) {
  var bookmarks = await db.all(`SELECT url, title, tags, notes, pinned, createdAt FROM bookmarks WHERE profileId = ? ORDER BY createdAt DESC`, [profileId])
  bookmarks = bookmarks.map(toNewFormat)

  // apply tag filter
  if (tag) {
    if (Array.isArray(tag)) {
      bookmarks = bookmarks.filter(b => {
        return tag.reduce((agg, t) => agg & b.tags.includes(t), true)
      })
    } else {
      bookmarks = bookmarks.filter(b => b.tags.includes(tag))
    }
  }

  return bookmarks
}

export async function listPinnedBookmarks (profileId) {
  var bookmarks = await db.all(`SELECT url, title, tags, notes, pinned, createdAt FROM bookmarks WHERE profileId = ? AND pinned = 1 ORDER BY createdAt DESC`, [profileId])
  return bookmarks.map(toNewFormat)
}

export async function listBookmarkTags (profileId) {
  var tagSet = new Set()
  var bookmarks = await db.all(`SELECT tags FROM bookmarks WHERE profileId = ?`, [profileId])
  bookmarks.forEach(b => {
    if (b.tags) {
      b.tags.split(' ').forEach(t => tagSet.add(t))
    }
  })
  return Array.from(tagSet)
}

// TEMP
// apply normalization to old bookmarks
// (can probably remove this in 2018 or so)
// -prf
export async function fixOldBookmarks () {
  var bookmarks = await db.all(`SELECT url FROM bookmarks`)
  bookmarks.forEach(b => {
    let newUrl = normalizeUrl(b.url, NORMALIZE_OPTS)
    db.run(`UPDATE bookmarks SET url = ? WHERE url = ?`, [newUrl, b.url])
  })
}

function tagsToString (v) {
  if (Array.isArray(v)) {
    v = v.join(' ')
  }
  return v
}

function toNewFormat (b) {
  if (!b) return b
  return {
    _origin: false,
    _url: false,
    private: true,
    createdAt: b.createdAt * 1e3, // convert to ms
    href: b.url,
    title: b.title,
    tags: b.tags ? b.tags.split(' ').filter(Boolean) : [],
    notes: b.notes,
    pinned: !!b.pinned
  }
}