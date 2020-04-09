import { parseDriveUrl } from '../../../../lib/urls'
import { PermissionsError } from 'beaker-error-constants'
import * as permissions from '../../../ui/permissions'
import * as drives from '../../../hyper/drives'
import * as hyperDns from '../../../hyper/dns'
import { HYPERDRIVE_HASH_REGEX } from '../../../../lib/const'

// constants
// =

const API_DOCS_URL = 'https://beakerbrowser.com/docs/apis/experimental-datpeers.html'
const API_PERM_ID = 'experimentalDatPeers'
const LAB_API_ID = 'datPeers'
const LAB_PERMS_OBJ = {perm: API_PERM_ID, labApi: LAB_API_ID, apiDocsUrl: API_DOCS_URL}

// exported api
// =

export default {
  async list () {
    await permissions.checkLabsPerm(Object.assign({sender: this.sender}, LAB_PERMS_OBJ))
    var drive = await getSenderDrive(this.sender)
    // TODO return drives.getDaemon().ext_listPeers(drive.key.toString('hex'))
  },

  async get (peerId) {
    await permissions.checkLabsPerm(Object.assign({sender: this.sender}, LAB_PERMS_OBJ))
    var drive = await getSenderDrive(this.sender)
    // TODO return drives.getDaemon().ext_getPeer(drive.key.toString('hex'), peerId)
  },

  async broadcast (data) {
    await permissions.checkLabsPerm(Object.assign({sender: this.sender}, LAB_PERMS_OBJ))
    var drive = await getSenderDrive(this.sender)
    // TODO return drives.getDaemon().ext_broadcastEphemeralMessage(drive.key.toString('hex'), data)
  },

  async send (peerId, data) {
    await permissions.checkLabsPerm(Object.assign({sender: this.sender}, LAB_PERMS_OBJ))
    var drive = await getSenderDrive(this.sender)
    // TODO return drives.getDaemon().ext_sendEphemeralMessage(drive.key.toString('hex'), peerId, data)
  },

  async getSessionData () {
    await permissions.checkLabsPerm(Object.assign({sender: this.sender}, LAB_PERMS_OBJ))
    var drive = await getSenderDrive(this.sender)
    // TODO return drives.getDaemon().ext_getSessionData(drive.key.toString('hex'))
  },

  async setSessionData (sessionData) {
    await permissions.checkLabsPerm(Object.assign({sender: this.sender}, LAB_PERMS_OBJ))
    var drive = await getSenderDrive(this.sender)
    // TODO return drives.getDaemon().ext_setSessionData(drive.key.toString('hex'), sessionData)
  },

  async createEventStream () {
    await permissions.checkLabsPerm(Object.assign({sender: this.sender}, LAB_PERMS_OBJ))
    var drive = await getSenderDrive(this.sender)
    // TODO return drives.getDaemon().ext_createDatPeersStream(drive.key.toString('hex'))
  },

  async getOwnPeerId () {
    await permissions.checkLabsPerm(Object.assign({sender: this.sender}, LAB_PERMS_OBJ))
    // TODO return drives.getDaemon().ext_getOwnPeerId()
  }
}

// internal methods
// =

async function getSenderDrive (sender) {
  var url = sender.getURL()
  if (!url.startsWith('hyper:')) {
    throw new PermissionsError('Only hyper:// sites can use the datPeers API')
  }
  var urlp = parseDriveUrl(url)
  if (!HYPERDRIVE_HASH_REGEX.test(urlp.host)) {
    urlp.host = await hyperDns.resolveName(url)
  }
  return drives.getDrive(urlp.host)
}
