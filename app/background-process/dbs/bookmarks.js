import * as db from './profile-data-db'

// exported methods
// =

export function add (profileId, url, title, pinned) {
  return db.run(`
    INSERT OR REPLACE
      INTO bookmarks (profileId, url, title, pinned)
      VALUES (?, ?, ?, ?)
  `, [profileId, url, title, pinned])
}

export function changeTitle (profileId, url, title) {
  return db.run(`UPDATE bookmarks SET title = ? WHERE profileId = ? AND url = ?`, [title, profileId, url])
}

export function changeUrl (profileId, oldUrl, newUrl) {
  return db.run(`UPDATE bookmarks SET url = ? WHERE profileId = ? AND url = ?`, [newUrl, profileId, oldUrl])
}

export function togglePinned (profileId, url, pinned) {
  return db.run(`UPDATE bookmarks SET pinned = ? WHERE profileId = ? AND url = ?`, [pinned ? 1 : 0, profileId, url])
}

export function remove (profileId, url) {
  return db.run(`DELETE FROM bookmarks WHERE profileId = ? AND url = ?`, [profileId, url])
}

export function get (profileId, url) {
  return db.get(`SELECT url, title FROM bookmarks WHERE profileId = ? AND url = ?`, [profileId, url])
}

export function list (profileId, opts) {
  var extra = (opts && opts.pinned) ? 'AND pinned = 1' : ''
  return db.all(`SELECT url, title, pinned FROM bookmarks WHERE profileId = ? ${extra} ORDER BY createdAt DESC`, [profileId])
}
