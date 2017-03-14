import * as db from './profiles'

// exported api
// =

export function get (profileId, name) {
  return db.get(`SELECT name, url, created_at FROM apps WHERE profile_id = ? AND name = ?`, [profileId, name])
}

export function list (profileId) {
  return db.all(`SELECT url, name FROM apps WHERE profile_id = ?`, [profileId])
}

export function bind (profileId, name, url) {
  return db.run(`
    INSERT OR REPLACE
      INTO apps (profile_id, name, url, created_at)
      VALUES (?, ?, ?, ?)
  `, [profileId, name, url, Date.now()])
}

export function unbind (profileId, name) {
  return db.run(`DELETE FROM apps WHERE profile_id = ? AND name = ?`, [profileId, name])
}