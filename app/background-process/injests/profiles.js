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
      type: ProfilesAPI.getArchiveType()
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

export async function getOrCreateArchive (type, manifest) {
  // look up the publish record
  var archiveRecord = await profilesApi.getPublishedArchive(profileArchive, type)

  if (archiveRecord && archiveRecord.url) {
    // make sure we can access the archive, and that it's saved
    let archive = new DatArchive(archiveRecord.url)
    try {
      let info = archive.getInfo()
      if (info.userSettings.isSaved) {
        // we're set
        return archive
      }
    } catch (e) {
      // ignore
    }
    // unpublish, the record is bad
    await profilesApi.unpublishArchive(profileArchive, archive)
  }

  // create new archive
  let archive = await DatArchive.create(manifest)
  await profilesApi.publishArchive(profileArchive, archive)
  return archive
}