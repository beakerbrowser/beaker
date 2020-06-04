import * as db from './profile-data-db'
import knex from '../lib/knex'

export async function get (key) {
  return db.get(knex('folder_syncs').where({key}))
}

export async function getPath (key) {
  var setting = await get(key)
  return setting ? setting.localPath : undefined
}

export async function insert (key, values) {
  return db.run(knex('folder_syncs').insert(Object.assign({key}, values)))
}

export async function update (key, values) {
  return db.run(knex('folder_syncs').update(values).where({key}))
}

export async function del (key) {
  return db.run(knex('folder_syncs').where({key}).del())
}