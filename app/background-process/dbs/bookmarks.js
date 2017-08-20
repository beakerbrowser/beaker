/*
LEGACY
This will be replaced by the Profiles Injest DB
But currently Injest doesnt have a way to do private records
So this is used for the private bookmarks
-prf
*/

import * as db from './profile-data-db'
import normalizeUrl from 'normalize-url'

const NORMALIZE_OPTS = {
  stripFragment: false,
  stripWWW: false,
  removeQueryParameters: false
}

// exported methods
// =

export function bookmark (profileId, url, {title}) {
  return db.run(`
    INSERT OR REPLACE
      INTO bookmarks (profileId, url, title, pinned)
      VALUES (?, ?, ?, 0)
  `, [profileId, url, title])
}

export function unbookmark (profileId, url) {
  return db.run(`DELETE FROM bookmarks WHERE profileId = ? AND url = ?`, [profileId, url])
}

export function setBookmarkPinned (profileId, url, pinned) {
  return db.run(`UPDATE bookmarks SET pinned = ? WHERE profileId = ? AND url = ?`, [pinned ? 1 : 0, profileId, url])
}

export async function getBookmark (profileId, url) {
  return toNewFormat(await db.get(`SELECT url, title, pinned FROM bookmarks WHERE profileId = ? AND url = ?`, [profileId, url]))
}

export async function listBookmarks (profileId) {
  var bookmarks = await db.all(`SELECT url, title, pinned FROM bookmarks WHERE profileId = ? ORDER BY createdAt DESC`, [profileId])
  return bookmarks.map(toNewFormat)
}

export async function listPinnedBookmarks (profileId) {
  var bookmarks = await db.all(`SELECT url, title, pinned FROM bookmarks WHERE profileId = ? AND pinned = 1 ORDER BY createdAt DESC`, [profileId])
  return bookmarks.map(toNewFormat)
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

function toNewFormat (b) {
  if (!b) return b
  return {
    _origin: false,
    _url: false,
    private: true,
    href: b.url,
    title: b.title,
    pinned: !!b.pinned
  }
}