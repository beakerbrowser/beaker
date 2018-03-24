import path from 'path'
import pda from 'pauls-dat-api'
import pick from 'lodash.pick'
import emitStream from 'emit-stream'
import {EventEmitter} from 'events'
import * as workspacesDb from '../dbs/workspaces'
import * as scopedFSes from '../../lib/bg/scoped-fses'
import {
  DAT_CONFIGURABLE_FIELDS,
  DAT_QUOTA_DEFAULT_BYTES_ALLOWED,
  DAT_VALID_PATH_REGEX,
  DAT_MANIFEST_FILENAME
} from '../../lib/const'
import {
  PermissionsError,
  QuotaExceededError,
  ProtectedFileNotWritableError,
  InvalidPathError
} from 'beaker-error-constants'

const PROFILE_ID = 0 // currently not being used

// exported api
// =

export default {
  async getInfo (workspaceUrl, opts = {}) {
    const wsfs = await lookupWorkspace(this.sender, workspaceUrl)

    const [info, size] = await Promise.all([
      pda.readManifest(wsfs),
      pda.readSize(wsfs, '/')
    ])

    // return a subset of the data
    return {
      key: null,
      url: workspaceUrl,
      isOwner: true,
      networked: false,

      // state
      version: undefined,
      peers: 0,
      mtime: undefined,
      size,

      // manifest
      title: info.title,
      description: info.description,
      type: info.type
    }
  },

  async configure (workspaceUrl, settings) {
    const wsfs = await lookupWorkspace(this.sender, workspaceUrl)

    if (!settings || typeof settings !== 'object') throw new Error('Invalid argument')
    await assertQuotaPermission(wsfs, this.sender, Buffer.byteLength(JSON.stringify(settings), 'utf8'))

    let manifestUpdates = pick(settings, DAT_CONFIGURABLE_FIELDS)
    if (Object.keys(manifestUpdates).length) {
      await pda.updateManifest(wsfs, manifestUpdates)
    }
  },

  async history (workspaceUrl, opts = {}) {
    assertAccessPermission(this.sender, workspaceUrl)
    // noop
    return []
  },

  async stat (workspaceUrl, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    const wsfs = await lookupWorkspace(this.sender, workspaceUrl)
    return pda.stat(wsfs, filepath)
  },

  async readFile (workspaceUrl, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    const wsfs = await lookupWorkspace(this.sender, workspaceUrl)
    return pda.readFile(wsfs, filepath, opts)
  },

  async writeFile (workspaceUrl, filepath, data, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    const wsfs = await lookupWorkspace(this.sender, workspaceUrl)
    const sourceSize = Buffer.byteLength(data, opts.encoding)
    await assertQuotaPermission(wsfs, this.sender, sourceSize)
    assertValidFilePath(filepath)
    assertUnprotectedFilePath(filepath, this.sender)
    return pda.writeFile(wsfs, filepath, data, opts)
  },

  async unlink (workspaceUrl, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    const wsfs = await lookupWorkspace(this.sender, workspaceUrl)
    assertUnprotectedFilePath(filepath, this.sender)
    return pda.unlink(wsfs, filepath)
  },

  async copy (workspaceUrl, filepath, dstPath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    const wsfs = await lookupWorkspace(this.sender, workspaceUrl)
    assertUnprotectedFilePath(dstPath, this.sender)
    const sourceSize = await pda.readSize(wsfs, filepath)
    await assertQuotaPermission(wsfs, this.sender, sourceSize)
    return pda.copy(wsfs, filepath, dstPath)
  },

  async rename (workspaceUrl, filepath, dstpath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    const wsfs = await lookupWorkspace(this.sender, workspaceUrl)
    assertValidFilePath(dstpath)
    assertUnprotectedFilePath(filepath, this.sender)
    assertUnprotectedFilePath(dstpath, this.sender)
    return pda.rename(wsfs, filepath, dstpath)
  },

  async download (workspaceUrl, opts = {}) {
    assertAccessPermission(this.sender, workspaceUrl)
    // noop
  },

  async readdir (workspaceUrl, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    const wsfs = await lookupWorkspace(this.sender, workspaceUrl)
    var names = await pda.readdir(wsfs, filepath, opts)
    if (opts.stat) {
      for (let i = 0; i < names.length; i++) {
        names[i] = {
          name: names[i],
          stat: await pda.stat(wsfs, path.join(filepath, names[i]))
        }
      }
    }
    return names
  },

  async mkdir (workspaceUrl, filepath, opts) {
    filepath = normalizeFilepath(filepath || '')
    const wsfs = await lookupWorkspace(this.sender, workspaceUrl)
    assertValidPath(filepath)
    assertUnprotectedFilePath(filepath, this.sender)
    return pda.mkdir(wsfs, filepath)
  },

  async rmdir (workspaceUrl, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    const wsfs = await lookupWorkspace(this.sender, workspaceUrl)
    assertUnprotectedFilePath(filepath, this.sender)
    return pda.rmdir(wsfs, filepath, opts)
  },

  async watch (workspaceUrl, pathPattern) {
    const wsfs = await lookupWorkspace(this.sender, workspaceUrl)
    return pda.watch(wsfs, pathPattern)
  },

  async createNetworkActivityStream (workspaceUrl) {
    assertAccessPermission(this.sender, workspaceUrl)
    // noop
    return emitStream(new EventEmitter())
  }
}

async function lookupWorkspace (sender, workspaceUrl) {
  const workspaceName = workspaceUrl.slice('workspace://'.length) // extract origin
  assertAccessPermission(sender, workspaceName)
  const ws = await workspacesDb.get(PROFILE_ID, workspaceName)
  assertValidWorkspaceRecord(workspaceName, ws)
  const wsfs = scopedFSes.get(ws.localFilesPath)
  return wsfs
}

function assertAccessPermission (sender, workspaceName) {
  const url = sender.getURL()
  if (url.startsWith('beaker:')) return
  if (url.startsWith(`workspace://${workspaceName}/`)) return
  throw new PermissionsError()
}

function assertValidWorkspaceRecord (workspaceName, ws) {
  if (!ws) throw new Error(`No workspace found at ${workspaceName}`)
  if (!ws.localFilesPath) throw new Error(`No files path set for workspace ${workspaceName}`)
  if (!ws.publishTargetUrl) throw new Error(`No target site set for workspace ${workspaceName}`)
}

async function assertQuotaPermission (wsfs, sender, byteLength) {
  // beaker: always allowed
  if (sender.getURL().startsWith('beaker:')) {
    return
  }

  // fallback to default quota
  var bytesAllowed = /* TODO userSettings.bytesAllowed || */ DAT_QUOTA_DEFAULT_BYTES_ALLOWED

  // check the new size
  const currentSize = pda.readSize(wsfs, '/')
  const newSize = (currentSize + byteLength)
  if (newSize > bytesAllowed) {
    throw new QuotaExceededError()
  }
}

function assertValidFilePath (filepath) {
  if (filepath.slice(-1) === '/') {
    throw new InvalidPathError('Files can not have a trailing slash')
  }
  assertValidPath(filepath)
}

function assertValidPath (fileOrFolderPath) {
  if (!DAT_VALID_PATH_REGEX.test(fileOrFolderPath)) {
    throw new InvalidPathError('Path contains invalid characters')
  }
}

// helper to check if filepath refers to a file that userland is not allowed to edit directly
function assertUnprotectedFilePath (filepath, sender) {
  if (sender.getURL().startsWith('beaker:')) {
    return // can write any file
  }
  if (filepath === '/' + DAT_MANIFEST_FILENAME) {
    throw new ProtectedFileNotWritableError()
  }
}

function normalizeFilepath (str) {
  str = decodeURIComponent(str)
  if (str.charAt(0) !== '/') {
    str = '/' + str
  }
  return str
}