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
    return await datUserSessions.get(this.sender)
  },

  async requestSignin () {
    assertDatOnly(this.sender)

    // capture the requester's info
    var manifest = await getManifest(this.sender.getURL())
    var requester = {
      url: this.sender.getURL(),
      manifest
    }

    // open the signin page
    this.sender.once('did-finish-load', () => {
      this.sender.executeJavaScript(`
        window.setup({requester: ${JSON.stringify(requester)}})
      `)
    })
    this.sender.loadURL('beaker://signin')
    // TODO
  },

  async signout () {
    assertDatOnly(this.sender)
    await datUserSessions.destroy(this.sender)
  },

  // beaker: only
  // =

  async createSession (opts) {
    assertBeakerOnly(this.sender)

    // create the session
    // var sessionId = datUserSessions.create(this.sender, {
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
