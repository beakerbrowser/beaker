import {app, shell} from 'electron'
import * as dft from 'diff-file-tree'
import * as diff from 'diff'
import anymatch from 'anymatch'
import fs from 'fs'
import path from 'path'
import * as archivesDb from '../dbs/archives'
import * as workspacesDb from '../dbs/workspaces'
import * as datLibrary from '../networks/dat/library'
import {timer} from '../../lib/time'
import * as scopedFSes from '../../lib/bg/scoped-fses'
import {DAT_HASH_REGEX, WORKSPACE_VALID_NAME_REGEX} from '../../lib/const'
import {
  NotAFolderError,
  ProtectedFileNotWritableError,
  PermissionsError,
  InvalidURLError,
  ArchiveNotWritableError
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

  // create or update a workspace
  // - profileId: number, the id of the browsing profile
  // - name: string, the name of the workspace
  // - newData attributes:
  //   - name: string?
  //   - localFilesPath: string?
  //   - publishTargetUrl: string?
  async set (profileId, name, newData = {}) {
    assertValidName(name)
    if (newData.name) assertValidName(newData.name)
    if (newData.localFilesPath) await assertSafeFilesPath(newData.localFilesPath)
    if (newData.publishTargetUrl) {
      await assertDatUrl(newData.publishTargetUrl)
      await assertDatIsSavedAndOwned(newData.publishTargetUrl)
    }
    return workspacesDb.set(profileId, name, newData)
  },

  // remove a workspace
  // - profileId: number, the id of the browsing profile
  // - name: string, the name of the workspace
  async remove (profileId, name) {
    assertValidName(name)
    return workspacesDb.remove(profileId, name)
  },

  // list the files that have changed
  // - profileId: number, the id of the browsing profile
  // - name: string, the name of the workspace
  // - opts
  //   - shallow: bool, dont descend into changed folders (default true)
  //   - compareContent: bool, compare the actual content (default true)
  //   - paths: Array<string>, a whitelist of files to compare
  async listChangedFiles (profileId, name, opts={}) {
    assertValidName(name)
    opts = massageDiffOpts(opts)

    // fetch workspace
    const ws = await workspacesDb.get(profileId, name)
    if (!ws) throw new Error(`No workspace found at ${name}`)
    if (!ws.localFilesPath) throw new Error(`No files path set for ${name}`)
    if (!ws.publishTargetUrl) throw new Error(`No target site set for ${name}`)
    await assertDatIsSavedAndOwned(ws.publishTargetUrl)

    // get the scoped fs and archive
    var scopedFS, archive
    await timer(3e3, async (checkin) => { // put a max 3s timeout on loading the dat
      checkin('searching for dat')
      scopedFS = scopedFSes.get(ws.localFilesPath)
      archive = await datLibrary.getOrLoadArchive(ws.publishTargetUrl)
    })

    // build ignore rules
    if (opts.paths) {
      opts.filter = (filepath) => !anymatch(opts.paths, filepath)
    } else {
      const ignoreRules = await readDatIgnore(scopedFS)
      opts.filter = (filepath) => anymatch(ignoreRules, filepath)
    }

    // run diff
    return dft.diff({fs: scopedFS}, {fs: archive}, opts)
  },

  // diff a file in a workspace
  // - profileId: number, the id of the browsing profile
  // - name: string, the name of the workspace
  // - filepath: string, the path of the file in the workspace
  async diff (profileId, name, filepath) {
    assertValidName(name)

    // fetch workspace
    const ws = await workspacesDb.get(profileId, name)
    if (!ws) throw new Error(`No workspace found at ${name}`)
    if (!ws.localFilesPath) throw new Error(`No files path set for ${name}`)
    if (!ws.publishTargetUrl) throw new Error(`No target site set for ${name}`)
    await assertDatIsSavedAndOwned(ws.publishTargetUrl)

    // get the scoped fs and archive
    var scopedFS, archive
    await timer(3e3, async (checkin) => { // put a max 3s timeout on loading the dat
      checkin('searching for dat')
      scopedFS = scopedFSes.get(ws.localFilesPath)
      archive = await datLibrary.getOrLoadArchive(ws.publishTargetUrl)
    })

    // read the file in both sources
    const [newFile, oldFile] = await Promise.all([readFile(scopedFS, filepath), readFile(archive, filepath)])

    // return the diff
    return diff.diffLines(oldFile, newFile)
  },

  // publish the files that have changed
  // - profileId: number, the id of the browsing profile
  // - name: string, the name of the workspace
  // - opts
  //   - shallow: bool, dont descend into changed folders (default true)
  //   - compareContent: bool, compare the actual content (default true)
  //   - paths: Array<string>, a whitelist of files to compare
  async publish (profileId, name, opts={}) {
    assertValidName(name)
    opts = massageDiffOpts(opts)

    // fetch workspace
    const ws = await workspacesDb.get(profileId, name)
    if (!ws) throw new Error(`No workspace found at ${name}`)
    if (!ws.localFilesPath) throw new Error(`No files path set for ${name}`)
    if (!ws.publishTargetUrl) throw new Error(`No target site set for ${name}`)
    await assertDatIsSavedAndOwned(ws.publishTargetUrl)

    // get the scoped fs and archive
    var scopedFS, archive
    await timer(3e3, async (checkin) => { // put a max 3s timeout on loading the dat
      checkin('searching for dat')
      scopedFS = scopedFSes.get(ws.localFilesPath)
      archive = await datLibrary.getOrLoadArchive(ws.publishTargetUrl)
    })

    // build ignore rules
    if (opts.paths) {
      opts.filter = (filepath) => !anymatch(opts.paths, filepath)
    } else {
      const ignoreRules = await readDatIgnore(scopedFS)
      opts.filter = (filepath) => anymatch(ignoreRules, filepath)
    }

    // run and apply diff
    var diff = await dft.diff({fs: scopedFS}, {fs: archive}, opts)
    await dft.applyRight({fs: scopedFS}, {fs: archive}, diff)
  },

  // revert the files that have changed
  // - profileId: number, the id of the browsing profile
  // - name: string, the name of the workspace
  // - opts
  //   - shallow: bool, dont descend into changed folders (default true)
  //   - compareContent: bool, compare the actual content (default true)
  //   - paths: Array<string>, a whitelist of files to compare
  async revert (profileId, name, opts={}) {
    assertValidName(name)
    opts = massageDiffOpts(opts)

    // fetch workspace
    const ws = await workspacesDb.get(profileId, name)
    if (!ws) throw new Error(`No workspace found at ${name}`)
    if (!ws.localFilesPath) throw new Error(`No files path set for ${name}`)
    if (!ws.publishTargetUrl) throw new Error(`No target site set for ${name}`)
    await assertDatIsSavedAndOwned(ws.publishTargetUrl)

    // get the scoped fs and archive
    var scopedFS, archive
    await timer(3e3, async (checkin) => { // put a max 3s timeout on loading the dat
      checkin('searching for dat')
      scopedFS = scopedFSes.get(ws.localFilesPath)
      archive = await datLibrary.getOrLoadArchive(ws.publishTargetUrl)
    })

    // build ignore rules
    if (opts.paths) {
      opts.filter = (filepath) => !anymatch(opts.paths, filepath)
    } else {
      const ignoreRules = await readDatIgnore(scopedFS)
      opts.filter = (filepath) => anymatch(ignoreRules, filepath)
    }

    // run and apply diff
    var diff = await dft.diff({fs: scopedFS}, {fs: archive}, opts)
    await dft.applyLeft({fs: scopedFS}, {fs: archive}, diff)
  },

  openFolder (path) {
    return new Promise((resolve, reject) => {
      shell.openItem(path)
      resolve()
    })
  }
}

function massageDiffOpts (opts) {
  return {
    compareContent: typeof opts.compareContent === 'boolean' ? opts.compareContent : true,
    shallow: typeof opts.shallow === 'boolean' ? opts.shallow : true,
    paths: Array.isArray(opts.paths) ? opts.paths.filter(v => typeof v === 'string') : false
  }
}

function assertValidName (name) {
  if (!WORKSPACE_VALID_NAME_REGEX.test(name)) {
    throw new Error(`Invalid workspace name (${name})`)
  }
}

async function assertDatIsSavedAndOwned (url) {
  const key = datLibrary.fromURLToKey(url)
  const [meta, userSettings] = await Promise.all([
    archivesDb.getMeta(key),
    archivesDb.getUserSettings(0, key)
  ])
  if (!meta || !meta.isOwner) throw new ArchiveNotWritableError('You can\'t edit a dat you don\'t own.')
  if (!userSettings || !userSettings.isSaved) throw new ArchiveNotWritableError('The workspace\'s dat has been deleted.')
}

async function readDatIgnore (fs) {
  var rulesRaw = await readFile(fs, '.datignore')
  return rulesRaw.split('\n')
    .filter(Boolean)
    .map(rule => {
      if (!rule.startsWith('/')) {
        rule = '**/' + rule
      }
      return rule
    })
    .concat(['/.git', '/.dat'])
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

function assertDatUrl (url) {
  if (typeof url !== 'string' || !url.startsWith('dat://')) {
    throw new InvalidURLError('Invalid publishTargetUrl - must be a dat:// url.')
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