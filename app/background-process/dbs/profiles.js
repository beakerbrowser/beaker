import * as db from './profile-data-db'

// exported api
// =

export function list () {
  return db.all(`SELECT id, url, label, createdAt FROM profiles`)
}

export function get (id) {
  return db.get(`SELECT id, url, label, createdAt FROM profiles WHERE id = ?`, [id])
}

export function add (values) {
  values = values || {}
  return db.run(`
    INSERT
      INTO profiles (url, label)
      VALUES (?, ?)
  `, [values.url || '', values.label || ''])
}

export function update (id, values) {
  return db.run(`
    UPDATE profiles
      SET url = ?, label = ?
      WHERE id = ?
  `, [values.url, values.label, id])
}

export function remove (id) {
  return db.run(`DELETE FROM profiles WHERE id = ?`, [id])
}