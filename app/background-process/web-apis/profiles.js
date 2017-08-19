import assert from 'assert'
import {getProfileRecord, getAPI} from '../injests/profiles'

// exported api
// =

export default {
  
  // profiles
  // =

  async getUserProfile () {
    var profileRecord = await getProfileRecord(0)
    return getAPI().getProfile(profileRecord.url)
  },

  async getProfile (archive) {
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    return getAPI().getProfile(archive)
  },

  async setProfile (archive, data) {
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    assertObject(data, 'Parameter two must be an object')
    return getAPI().setProfile(archive, data)
  },

  // social relationships
  // =

  async follow (archive, targetUser, targetUserName) {
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    assertArchive(targetUser, 'Parameter two must be an archive object, or the URL of an archive')
    return getAPI().follow(archive, targetUser, targetUserName)
  },

  async unfollow (archive, targetUser) {
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    assertArchive(targetUser, 'Parameter two must be an archive object, or the URL of an archive')
    return getAPI().unfollow(archive, targetUser)
  },

  async listFollowers (archive) {
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    return getAPI().listFollowers(archive)
  },

  async countFollowers (archive) {
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    return getAPI().countFollowers(archive)
  },

  async listFriends (archive) {
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    return getAPI().listFriends(archive)
  },

  async countFriends (archive) {
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    return getAPI().countFriends(archive)
  },

  async isFollowing (archiveA, archiveB) {
    assertArchive(archiveA, 'Parameter one must be an archive object, or the URL of an archive')
    assertArchive(archiveB, 'Parameter two must be an archive object, or the URL of an archive')
    return getAPI().isFollowing(archiveA, archiveB)
  },

  async isFriendsWith (archiveA, archiveB) {
    assertArchive(archiveA, 'Parameter one must be an archive object, or the URL of an archive')
    assertArchive(archiveB, 'Parameter two must be an archive object, or the URL of an archive')
    return getAPI().isFriendsWith(archiveA, archiveB)    
  }
}

function assertArchive (v, msg) {
  assert(!!v && (typeof v === 'string' || typeof v.url === 'string'), msg)
}

function assertString (v, msg) {
  assert(!!v && typeof v === 'string', msg)
}

function assertObject (v, msg) {
  assert(!!v && typeof v === 'object', msg)
}
