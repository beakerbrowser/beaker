import * as db from './profile-data-db'

// exported api
// =

export function list () {
  return db.all(`SELECT id, url, createdAt FROM profiles`)
}

export function get (id) {
  return db.get(`SELECT id, url, createdAt FROM profiles WHERE id = ?`, [id])
}

export function add (values) {
  values = values || {}
  return db.run(`
    INSERT
      INTO profiles (url)
      VALUES (?)
  `, [values.url || ''])
}

export function update (id, values) {
  return db.run(`
    UPDATE profiles
      SET url = ?
      WHERE id = ?
  `, [values.url, id])
}

export function remove (id) {
  return db.run(`DELETE FROM profiles WHERE id = ?`, [id])
}
