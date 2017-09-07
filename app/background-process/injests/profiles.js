import {app} from 'electron'
import ProfilesAPI from 'beaker-profiles-api'
import path from 'path'
import * as db from '../dbs/profile-data-db'
import DatArchive from '../../lib/bg/dat-archive'

// globals
// =

var profilesApi
var profileArchive

// exported methods
// =

export async function setup () {
  // fetch the main profile
  var profileRecord = await getProfileRecord(0)

  // create archive as needed
  if (profileRecord.url) {
    profileArchive = new DatArchive(profileRecord.url)
  } else {
    profileArchive = await DatArchive.create({
      title: 'Anonymous',
      description: 'Beaker user profile',
      type: ['user-profile', 'beaker-user-profile-v1']
    })
    profileRecord.url = profileArchive.url
    await updateProfileRecord(0, profileRecord)
  }

  // open injest database
  var dbPath = path.join(app.getPath('userData'), 'Profiles-Injest')
  profilesApi = await ProfilesAPI.open(dbPath, profileArchive, {DatArchive})
}

export function getAPI () {
  return profilesApi
}

export function listProfileRecords () {
  return db.all(`SELECT id, url, createdAt FROM profiles`)
}

export function getProfileRecord (id) {
  return db.get(`SELECT id, url, createdAt FROM profiles WHERE id = ?`, [id])
}

export async function getProfileArchive (id) {
  var profileRecord = await getProfileRecord(id)
  return new DatArchive(profileRecord.url)
}

export function addProfileRecord (values) {
  values = values || {}
  return db.run(`
    INSERT
      INTO profiles (url)
      VALUES (?)
  `, [values.url || ''])
}

export function updateProfileRecord (id, values) {
  return db.run(`
    UPDATE profiles
      SET url = ?
      WHERE id = ?
  `, [values.url, id])
}

export function removeProfileRecord (id) {
  return db.run(`DELETE FROM profiles WHERE id = ?`, [id])
}
