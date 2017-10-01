import assert from 'assert'
import {PermissionsError} from 'beaker-error-constants'
import {getProfileRecord, getAPI} from '../ingests/profiles'
import {queryPermission} from '../ui/permissions'

// exported api
// =

export default {

  // profiles
  // =

  // get the current user's archive
  async getCurrentUserArchive () {
    await assertPermission(this.sender, 'app:profiles:read')
    var profileRecord = await getProfileRecord(0)
    return profileRecord.url
  },

  // get the current user's profile
  // - ._origin: string, the url of the user archive
  // - ._url: string, the url of the profile record
  // - .name: string
  // - .bio: string
  // - .avatar: string, the path of the avatar image
  // - .follows[n].url: string, the url of the followed user archive
  // - .follows[n].name: string, the name of the followed user
  async getCurrentUserProfile () {
    await assertPermission(this.sender, 'app:profiles:read')
    var profileRecord = await getProfileRecord(0)
    var profile = await getAPI().getProfile(profileRecord.url)
    return profile || defaultProfile()
  },

  // get the given user's profile
  // - ._origin: string, the url of the user archive
  // - ._url: string, the url of the profile record
  // - .name: string
  // - .bio: string
  // - .avatar: string, the path of the avatar image
  // - .follows[n].url: string, the url of the followed user archive
  // - .follows[n].name: string, the name of the followed user
  async getUserProfile (archive) {
    await assertPermission(this.sender, 'app:profiles:read')
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    await getAPI().addArchive(archive)
    var profile = await getAPI().getProfile(archive)
    return profile || defaultProfile()
  },

  // update the current user's profile
  // - data.name: string
  // - data.bio: string
  async setCurrentUserProfile (data) {
    await assertPermission(this.sender, 'app:profiles:edit-profile')
    assertObject(data, 'Parameter one must be an object')
    var profileRecord = await getProfileRecord(0)
    await getAPI().setProfile(profileRecord.url, data)
  },

  // write a new avatar image to the current user's profile
  // - imgData: ArrayBuffer|string, the image content. If a string, assumed encoding is 'base64'.
  // - imgExtension: string, the file-extension of the data. Eg 'png' 'jpg' 'gif'
  async setCurrentUserAvatar (imgData, imgExtension) {
    await assertPermission(this.sender, 'app:profiles:edit-profile')
    assertBuffer(imgData, 'Parameter one must be an ArrayBuffer or base64-encoded string')
    assertString(imgExtension, 'Parameter two must be a string')
    var profileRecord = await getProfileRecord(0)
    imgData = typeof imgData === 'string' ? Buffer.from(imgData, 'base64') : imgData
    await getAPI().setAvatar(profileRecord.url, imgData, imgExtension)
  },

  // social relationships
  // =

  async follow (targetUser, targetUserName) {
    await assertPermission(this.sender, 'app:profiles:edit-social')
    assertArchive(targetUser, 'Parameter one must be an archive object, or the URL of an archive')
    var profileRecord = await getProfileRecord(0)
    await getAPI().addArchive(targetUser)
    await getAPI().follow(profileRecord.url, targetUser, targetUserName)
  },

  async unfollow (targetUser) {
    await assertPermission(this.sender, 'app:profiles:edit-social')
    assertArchive(targetUser, 'Parameter one must be an archive object, or the URL of an archive')
    var profileRecord = await getProfileRecord(0)
    await getAPI().addArchive(targetUser)
    await getAPI().unfollow(profileRecord.url, targetUser)
  },

  async listFollowers (archive) {
    await assertPermission(this.sender, 'app:profiles:read')
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    await getAPI().addArchive(archive)
    return getAPI().listFollowers(archive)
  },

  async countFollowers (archive) {
    await assertPermission(this.sender, 'app:profiles:read')
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    await getAPI().addArchive(archive)
    return getAPI().countFollowers(archive)
  },

  async listFriends (archive) {
    await assertPermission(this.sender, 'app:profiles:read')
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    await getAPI().addArchive(archive)
    return getAPI().listFriends(archive)
  },

  async countFriends (archive) {
    await assertPermission(this.sender, 'app:profiles:read')
    assertArchive(archive, 'Parameter one must be an archive object, or the URL of an archive')
    await getAPI().addArchive(archive)
    return getAPI().countFriends(archive)
  },

  async isFollowing (archiveA, archiveB) {
    await assertPermission(this.sender, 'app:profiles:read')
    assertArchive(archiveA, 'Parameter one must be an archive object, or the URL of an archive')
    assertArchive(archiveB, 'Parameter two must be an archive object, or the URL of an archive')
    await Promise.all([
      getAPI().addArchive(archiveA),
      getAPI().addArchive(archiveB)
    ])
    return getAPI().isFollowing(archiveA, archiveB)
  },

  async isFriendsWith (archiveA, archiveB) {
    await assertPermission(this.sender, 'app:profiles:read')
    assertArchive(archiveA, 'Parameter one must be an archive object, or the URL of an archive')
    assertArchive(archiveB, 'Parameter two must be an archive object, or the URL of an archive')
    await Promise.all([
      getAPI().addArchive(archiveA),
      getAPI().addArchive(archiveB)
    ])
    return getAPI().isFriendsWith(archiveA, archiveB)
  }
}

function defaultProfile () {
  return {
    name: '',
    bio: '',
    avatar: false
  }
}

async function assertPermission (sender, perm) {
  if (sender.getURL().startsWith('beaker:')) {
    return true
  }
  if (await queryPermission(perm, sender)) return true
  throw new PermissionsError()
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

function assertBuffer (v, msg) {
  if (v && typeof v === 'string') {
    try {
      v = Buffer.from(v, 'base64')
    } catch (e) {
      throw new Error(msg)
    }
  }
  assert(v && Buffer.isBuffer(v), msg)
}