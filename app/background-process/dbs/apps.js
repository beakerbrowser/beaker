import * as db from './profile-data-db'

// exported api
// =

export function get (profileId, name) {
  return db.get(`SELECT name, url, createdAt FROM apps WHERE profileId = ? AND name = ?`, [profileId, name])
}

export function list (profileId) {
  return db.all(`SELECT url, name FROM apps WHERE profileId = ?`, [profileId])
}

export function bind (profileId, name, url) {
  return db.run(`
    INSERT OR REPLACE
      INTO apps (profileId, name, url)
      VALUES (?, ?, ?)
  `, [profileId, name, url])
}

export function unbind (profileId, name) {
  return db.run(`DELETE FROM apps WHERE profileId = ? AND name = ?`, [profileId, name])
}