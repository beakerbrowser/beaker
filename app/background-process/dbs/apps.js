/*
TODO(apps) this API is currently not in use, but will be rebuilt for use in a future iteration -prf
*/

import * as db from './profile-data-db'

// exported api
// =

export function get (profileId, name) {
  return db.get(`SELECT name, url, updatedAt, createdAt FROM apps WHERE profileId = ? AND name = ?`, [profileId, name])
}

export function list (profileId) {
  return db.all(`SELECT url, name, updatedAt, createdAt FROM apps WHERE profileId = ? ORDER BY name`, [profileId])
}

export async function bind (profileId, name, url) {
  await db.run(`
    INSERT OR REPLACE
      INTO apps (profileId, name, url, updatedAt)
      VALUES (?, ?, ?, ?)
  `, [profileId, name, url, Date.now()])
  await db.run(`
    INSERT
      INTO apps_log (profileId, name, url)
      VALUES (?, ?, ?)
  `, [profileId, name, url])
}

export function unbind (profileId, name) {
  return db.run(`DELETE FROM apps WHERE profileId = ? AND name = ?`, [profileId, name])
}

export function unbindUrlFromAllNames (profileId, url) {
  return db.run(`DELETE FROM apps WHERE profileId = ? AND url = ?`, [profileId, url])
}
