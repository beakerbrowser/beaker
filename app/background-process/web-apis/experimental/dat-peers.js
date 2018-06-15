import parseDatURL from 'parse-dat-url'
import * as datLibrary from '../../networks/dat/library'
import datDns from '../../networks/dat/dns'
import * as datExtensions from '../../networks/dat/extensions'
import {checkLabsPerm} from '../../ui/permissions'
import {DAT_HASH_REGEX} from '../../../lib/const'
import {PermissionsError} from 'beaker-error-constants'

// constants
// =

const API_DOCS_URL = 'https://TODO' // TODO
const API_PERM_ID = 'experimentalDatPeers'
const LAB_API_ID = 'datPeers'
const LAB_PERMS_OBJ = {perm: API_PERM_ID, labApi: LAB_API_ID, apiDocsUrl: API_DOCS_URL}

// exported api
// =

export default {
  async list () {
    await checkLabsPerm(Object.assign({sender: this.sender}, LAB_PERMS_OBJ))
    var archive = await getSenderArchive(this.sender)
    return datExtensions.listPeers(archive)
  },

  async get (peerId) {
    await checkLabsPerm(Object.assign({sender: this.sender}, LAB_PERMS_OBJ))
    var archive = await getSenderArchive(this.sender)
    return datExtensions.getPeer(archive, peerId)
  },

  async broadcast (data) {
    await checkLabsPerm(Object.assign({sender: this.sender}, LAB_PERMS_OBJ))
    var archive = await getSenderArchive(this.sender)
    return datExtensions.broadcastEphemeralMessage(archive, data)
  },

  async send (peerId, data) {
    await checkLabsPerm(Object.assign({sender: this.sender}, LAB_PERMS_OBJ))
    var archive = await getSenderArchive(this.sender)
    return datExtensions.sendEphemeralMessage(archive, peerId, data)
  },

  async getSessionData () {
    await checkLabsPerm(Object.assign({sender: this.sender}, LAB_PERMS_OBJ))
    var archive = await getSenderArchive(this.sender)
    return datExtensions.getSessionData(archive)
  },

  async setSessionData (sessionData) {
    await checkLabsPerm(Object.assign({sender: this.sender}, LAB_PERMS_OBJ))
    var archive = await getSenderArchive(this.sender)
    return datExtensions.setSessionData(archive, sessionData)
  },

  async createEventStream () {
    await checkLabsPerm(Object.assign({sender: this.sender}, LAB_PERMS_OBJ))
    var archive = await getSenderArchive(this.sender)
    return datExtensions.createDatPeersStream(archive)
  }
}

// internal methods
// =

async function getSenderArchive (sender) {
  var url = sender.getURL()
  if (!url.startsWith('dat:')) {
    throw new PermissionsError('Only dat:// sites can use the datPeers API')
  }
  var urlp = parseDatURL(url)
  if (!DAT_HASH_REGEX.test(urlp.host)) {
    urlp.host = await datDns.resolveName(url)
  }
  return datLibrary.getArchive(urlp.host)
}
