import parseDatURL from 'parse-dat-url'
import * as db from './profile-data-db'
import lock from '../../lib/lock'
import {DAT_HASH_REGEX} from '../../lib/const'

// exported api
// =

export function get (profileId, name) {
  return db.get(`SELECT * FROM workspaces WHERE profileId = ? AND name = ?`, [profileId, name])
}

export function getByPublishTargetUrl (profileId, url) {
  return db.get(`SELECT * FROM workspaces WHERE profileId = ? AND publishTargetUrl = ?`, [profileId, url])
}

export function list (profileId) {
  return db.all(`SELECT * FROM workspaces WHERE profileId = ? ORDER BY name`, [profileId])
}

export async function set (profileId, name, newData = {}) {
  var release = await lock('workspaces:update')
  try {
    // get old
    var data = await get(profileId, name)
    data = data || {}

    // update values
    if (typeof newData.name !== 'undefined') data.name = newData.name
    else data.name = name
    if (typeof newData.localFilesPath !== 'undefined') data.localFilesPath = newData.localFilesPath
    if (typeof newData.publishTargetUrl !== 'undefined') data.publishTargetUrl = toDatURL(newData.publishTargetUrl)

    // write
    await db.run(`
      INSERT OR REPLACE
        INTO workspaces (profileId, name, localFilesPath, publishTargetUrl, updatedAt)
        VALUES (?, ?, ?, ?, ?)
    `, [profileId, data.name, data.localFilesPath, data.publishTargetUrl, Date.now()])

    // delete old if required
    if (name !== data.name) {
      await db.run(`DELETE FROM workspaces WHERE profileId = ? AND name = ?`, [profileId, name])
    }
  } finally {
    release()
  }
}

export async function remove (profileId, name) {
  var release = await lock('workspaces:update')
  try {
    await db.run(`DELETE FROM workspaces WHERE profileId = ? AND name = ?`, [profileId, name])
  } finally {
    release()
  }
}

// helpers
// =

function toDatURL (url) {
  if (DAT_HASH_REGEX.test(url)) {
    return 'dat://' + url
  }
  if (url.startsWith('dat://') === false) {
    return ''
  }
  try {
    return 'dat://' + parseDatURL(url).hostname
  } catch (e) {
    return ''
  }
}