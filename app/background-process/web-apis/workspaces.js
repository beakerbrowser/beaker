import {app} from 'electron'
import * as dft from 'diff-file-tree'
import * as diff from 'diff'
import fs from 'fs'
import path from 'path'
import * as workspacesDb from '../dbs/workspaces'
import * as datLibrary from '../networks/dat/library'
import * as scopedFSes from '../../lib/bg/scoped-fses'
import {DAT_HASH_REGEX, WORKSPACE_VALID_NAME_REGEX} from '../../lib/const'
import {
  NotAFolderError,
  ProtectedFileNotWritableError,
  PermissionsError
} from 'beaker-error-constants'

const DISALLOWED_SAVE_PATH_NAMES = [
  'home',
  'desktop',
  'documents',
  'downloads',
  'music',
  'pictures',
  'videos'
]

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
    if (newData.localFilesPath) await assertSafeFilesPath(newData.localFilesPath)
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

  async diff (profileId, name, filepath) {
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
    const [newFile, oldFile] = await Promise.all([readFile(scopedFS, filepath), readFile(archive, filepath)])

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

async function assertSafeFilesPath (localFilesPath) {
  // stat the file
  const stat = await new Promise(resolve => {
    fs.stat(localFilesPath, (err, st) => resolve(st))
  })
  if (!stat) {
    throw new NotAFolderError('Invalid target folder: not found')
  }
  if (!stat.isDirectory()) {
    throw new NotAFolderError('Invalid target folder: not a folder')
  }

  // check whether this is an OS path
  for (let i = 0; i < DISALLOWED_SAVE_PATH_NAMES.length; i++) {
    let disallowedSavePathName = DISALLOWED_SAVE_PATH_NAMES[i]
    let disallowedSavePath = app.getPath(disallowedSavePathName)
    if (path.normalize(localFilesPath) === path.normalize(disallowedSavePath)) {
      throw new ProtectedFileNotWritableError(`This is the OS ${disallowedSavePathName} folder, which is protected. Please pick another folder or subfolder.`)
    }
  }
}

// helper to read a file via promise and return an empty string on fail
async function readFile (fs, filepath) {
  return new Promise(resolve => {
    fs.readFile(filepath, {encoding: 'utf8'}, (err, data) => {
      resolve(data || '')
    })
  })
}