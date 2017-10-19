import * as dft from 'diff-file-tree'
import * as diff from 'diff'
import * as workspacesDb from '../dbs/workspaces'
import * as datLibrary from '../networks/dat/library'
import * as scopedFSes from '../../lib/bg/scoped-fses'
import {DAT_HASH_REGEX, WORKSPACE_VALID_NAME_REGEX} from '../../lib/const'

// exported api
// =

export default {
  async list (profileId) {
    return workspacesDb.list(profileId)
  },

  async get (profileId, name) {
    assertValidName(name)
    return workspacesDb.get(profileId, name)
  },

  async set (profileId, name, newData = {}) {
    assertValidName(name)
    if (newData.name) assertValidName(newData.name)
    if (newData.localFilesPath) assertSafeFilesPath(newData.localFilesPath)
    return workspacesDb.set(profileId, name, newData)
  },

  async remove (profileId, name) {
    assertValidName(name)
    return workspacesDb.remove(profileId, name)
  },

  async listChangedFiles (profileId, name, opts={}) {
    assertValidName(name)
    opts = massageDiffOpts(opts)

    // fetch workspace
    const ws = await workspacesDb.get(profileId, name)
    if (!ws) throw new Error(`No workspace found at ${name}`)
    if (!ws.localFilesPath) throw new Error(`No files path set for ${name}`)
    if (!ws.publishTargetUrl) throw new Error(`No target site set for ${name}`)

    // fetch archive
    const archive = await datLibrary.getOrLoadArchive(ws.publishTargetUrl)

    // run diff
    return dft.diff(ws.localFilesPath, {fs: archive}, opts)
  },

  async diff (profileId, name, path) {
    assertValidName(name)

    // fetch workspace
    const ws = await workspacesDb.get(profileId, name)
    if (!ws) throw new Error(`No workspace found at ${name}`)
    if (!ws.localFilesPath) throw new Error(`No files path set for ${name}`)
    if (!ws.publishTargetUrl) throw new Error(`No target site set for ${name}`)

    // get the scoped fs and archive
    const scopedFS = scopedFSes.get(ws.localFilesPath)
    const archive = await datLibrary.getOrLoadArchive(ws.publishTargetUrl)

    // read the file in both sources
    const [newFile, oldFile] = await Promise.all([readFile(scopedFS, path), readFile(archive, path)])

    // return the diff
    return diff.diffLines(oldFile, newFile)
  },

  async publish (profileId, name, opts={}) {
    assertValidName(name)
    opts = massageDiffOpts(opts)

    // fetch workspace
    const ws = await workspacesDb.get(profileId, name)
    if (!ws) throw new Error(`No workspace found at ${name}`)
    if (!ws.localFilesPath) throw new Error(`No files path set for ${name}`)
    if (!ws.publishTargetUrl) throw new Error(`No target site set for ${name}`)

    // fetch archive
    const archive = await datLibrary.getOrLoadArchive(ws.publishTargetUrl)

    // run and apply diff
    var diff = await dft.diff(ws.localFilesPath, {fs: archive}, opts)
    return dft.applyRight(ws.localFilesPath, {fs: archive}, diff)
  },

  async revert (profileId, name, opts={}) {
    assertValidName(name)
    opts = massageDiffOpts(opts)

    // fetch workspace
    const ws = await workspacesDb.get(profileId, name)
    if (!ws) throw new Error(`No workspace found at ${name}`)
    if (!ws.localFilesPath) throw new Error(`No files path set for ${name}`)
    if (!ws.publishTargetUrl) throw new Error(`No target site set for ${name}`)

    // fetch archive
    const archive = await datLibrary.getOrLoadArchive(ws.publishTargetUrl)

    // run and apply diff
    var diff = await dft.diff(ws.localFilesPath, {fs: archive}, opts)
    return dft.applyLeft(ws.localFilesPath, {fs: archive}, diff)
  }
}

function massageDiffOpts (opts) {
  // TODO filtering
  return {
    compareContent: !!opts.compareContent,
    shallow: !!opts.shallow
  }
}

function assertValidName (name) {
  if (!WORKSPACE_VALID_NAME_REGEX.test(name)) {
    throw new Error(`Invalid workspace name (${name})`)
  }
}

function assertSafeFilesPath (localFilesPath) {
  // TODO check where it is, and then check that it exists
}

// helper to read a file via promise and return an empty string on fail
async function readFile (fs, path) {
  return new Promise(resolve => {
    fs.readFile(path, {encoding: 'utf8'}, (err, data) => {
      resolve(data || '')
    })
  })
}