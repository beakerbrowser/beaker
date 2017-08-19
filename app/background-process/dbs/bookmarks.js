/*
LEGACY
This will be replaced by the Profiles Injest DB
But currently Injest doesnt have a way to do private records
So this is used for the private bookmarks
-prf
*/

import * as db from './profile-data-db'

// exported methods
// =

export function bookmark (profileId, url, {title}) {
  return db.run(`
    INSERT OR REPLACE
      INTO bookmarks (profileId, url, title)
      VALUES (?, ?, ?)
  `, [profileId, url, title])
}

export function unbookmark (profileId, url) {
  return db.run(`DELETE FROM bookmarks WHERE profileId = ? AND url = ?`, [profileId, url])
}

export function setBookmarkPinned (profileId, url, pinned) {
  return db.run(`UPDATE bookmarks SET pinned = ? WHERE profileId = ? AND url = ?`, [pinned ? 1 : 0, profileId, url])
}

export async function getBookmark (profileId, url) {
  return toNewFormat(await db.get(`SELECT url, title FROM bookmarks WHERE profileId = ? AND url = ?`, [profileId, url]))
}

export async function listBookmarks (profileId) {
  var bookmarks = await db.all(`SELECT url, title, pinned FROM bookmarks WHERE profileId = ? ORDER BY createdAt DESC`, [profileId])
  return bookmarks.map(toNewFormat)
}

export async function listPinnedBookmarks (profileId) {
  var bookmarks = await db.all(`SELECT url, title, pinned FROM bookmarks WHERE profileId = ? AND pinned = 1 ORDER BY createdAt DESC`, [profileId])
  return bookmarks.map(toNewFormat)
}

function toNewFormat (b) {
  return {
    _origin: false,
    _url: false,
    private: true,
    href: b.url,
    title: b.title,
    pinned: !!b.pinned
  }
}