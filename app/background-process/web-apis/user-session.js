import {PermissionsError, UserDeniedError} from 'beaker-error-constants'
import pda from 'pauls-dat-api'
import * as datLibrary from '../networks/dat/library'
import * as datUserSessions from '../networks/dat/user-sessions'
import {parseUrlParts} from '../networks/dat/dns'

// exported api
// =

export default {
  // dat: only
  // =

  async fetch () {
    assertDatOnly(this.sender)
    return await datUserSessions.getSession(this.sender)
  },

  async requestSignin () {
    assertDatOnly(this.sender)

    // capture the requester's info
    var manifest = await getManifest(this.sender.getURL())
    var request = {
      requester: {
        url: this.sender.getURL(),
        manifest
      }
    }

    // create the session request
    var sessionId = datUserSessions.createSessionRequest(request)

    // open the signin page
    this.sender.loadURL('beaker://signin/' + sessionId)
  },

  async signout () {
    assertDatOnly(this.sender)
    await datUserSessions.destroySession(this.sender)
  },

  // beaker: only
  // =

  async getSessionRequest (id) {
    return datUserSessions.getSessionRequest(id)
  },

  async createSession (opts) {
    assertBeakerOnly(this.sender)

    // create the session
    // var sessionId = datUserSessions.createSession(this.sender, {
    //   // TODO
    // })

    // reopen the original page
    this.sender.loadURL(opts.returnURL)
  }
}

async function getManifest (url) {
  // get the archive
  var {archiveKey, version} = await parseUrlParts(url)
  var senderArchive = archiveKey && datLibrary.getArchive(archiveKey)
  if (!senderArchive) {
    throw new PermissionsError('Calling application must be a dat:// app')
  }

  // pick the fs
  var fs = (version) ? senderArchive.checkout(+version) : senderArchive.stagingFS

  // read the file
  try {
    return await pda.readManifest(fs)
  } catch (e) {
    return {}
  }
}

function assertBeakerOnly (sender) {
  if (!sender.getURL().startsWith('beaker:')) {
    throw new PermissionsError('Calling application must be a beaker:// app')
  }
}

function assertDatOnly (sender) {
  if (!sender.getURL().startsWith('dat:')) {
    throw new PermissionsError('Calling application must be a dat:// app')
  }
}
