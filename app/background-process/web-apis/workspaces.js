import {app, shell} from 'electron'
import * as dft from 'diff-file-tree'
import * as diff from 'diff'
import anymatch from 'anymatch'
import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import emitStream from 'emit-stream'
import {EventEmitter} from 'events'
import * as archivesDb from '../dbs/archives'
import * as workspacesDb from '../dbs/workspaces'
import * as datLibrary from '../networks/dat/library'
import {timer} from '../../lib/time'
import {getRandomName} from '../../lib/dict'
import {isFileNameBinary, isFileContentBinary} from '../../lib/mime'
import * as scopedFSes from '../../lib/bg/scoped-fses'
import {checkFolderIsEmpty} from '../../lib/bg/fs'
import {DAT_HASH_REGEX, WORKSPACE_VALID_NAME_REGEX} from '../../lib/const'
import {
  NotAFolderError,
  ProtectedFileNotWritableError,
  PermissionsError,
  InvalidURLError,
  ArchiveNotWritableError,
  InvalidEncodingError,
  DestDirectoryNotEmpty
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
    assertValidProfileId(profileId)
    return workspacesDb.list(profileId)
  },

  async get (profileId, name) {
    assertValidProfileId(profileId)
    if (typeof name === 'string' && name.startsWith('dat://')) {
      assertDatUrl(name)
      return workspacesDb.getByPublishTargetUrl(profileId, name)
    } else {
      assertValidName(name)
      return workspacesDb.get(profileId, name)
    }
  },

  // create or update a workspace
  // - profileId: number, the id of the browsing profile
  // - name: string, the name of the workspace
  // - opts
  //   - name: string?
  //   - localFilesPath: string?
  //   - publishTargetUrl: string?
  async set (profileId, name, opts = {}) {
    assertValidProfileId(profileId)
    assertValidName(name)
    if (typeof opts.localFilesPath !== 'undefined') {
      await assertSafeFilesPath(opts.localFilesPath)
    }
    if (typeof opts.publishTargetUrl !== 'undefined') {
      await assertDatUrl(opts.publishTargetUrl)
      await assertDatIsSavedAndOwned(opts.publishTargetUrl)
    }
    return workspacesDb.set(profileId, name, opts)
  },

  // create a new workspace
  // - profileId: number, the id of the browsing profile
  // - opts
  //   - publishTargetUrl: string, the url of the target dat. If none is given, will create a new dat.
  //   - name: string?, the name of the workspace. If none is given, will auto-generate a name.
  //   - localFilesPath: string?, the path of the local workspace.
  async create (profileId, opts={}) {
    assertValidProfileId(profileId)
    await assertDatUrl(opts.publishTargetUrl)
    await assertDatIsSavedAndOwned(opts.publishTargetUrl)
    await assertDatHasNoWorkspace(profileId, opts.publishTargetUrl)
    opts.name = opts.name || getRandomName()
    assertValidName(opts.name)
    await assertSafeFilesPath(opts.localFilesPath)
    await workspacesDb.set(profileId, opts.name, opts)
    return opts
  },

  // initialize a target folder with the dat files and (optionally) a template
  // - profileId: number, the id of the browsing profile
  // - name: string, the name of the workspace
  // - opts
  //   - template: string?, 'website' or 'app' or falsy
  async setupFolder (profileId, name, opts={}) {
    assertValidProfileId(profileId)

    // fetch workspace
    const ws = await workspacesDb.get(profileId, name)
    await validateWorkspaceRecord(name, ws)

    // get the scoped fs and archive
    var scopedFS, archive
    await timer(3e3, async (checkin) => { // put a max 3s timeout on loading the dat
      checkin('searching for dat')
      scopedFS = scopedFSes.get(ws.localFilesPath)
      archive = await datLibrary.getOrLoadArchive(ws.publishTargetUrl)
    })

    // check that the target folder is empty
    if (await checkFolderIsEmpty(ws.localFilesPath) === false) {
      return false
    }

    // revert from the archive
    var diff = await dft.diff({fs: archive}, {fs: scopedFS})
    await dft.applyRight({fs: archive}, {fs: scopedFS}, diff)

    // apply the template
    if (opts.template === 'app' || opts.template === 'website') {
      let templatePath = path.join(__dirname, 'assets', 'templates', opts.template)
      diff = await dft.diff(templatePath, {fs: scopedFS})
      diff = diff.filter(d => d.change !== 'del') // add or modify only
      await dft.applyRight(templatePath, {fs: scopedFS}, diff)
    }

    return true
  },

  // remove a workspace
  // - profileId: number, the id of the browsing profile
  // - name: string, the name of the workspace
  async remove (profileId, name) {
    assertValidProfileId(profileId)
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
    assertValidProfileId(profileId)
    assertValidName(name)
    opts = massageDiffOpts(opts)

    // fetch workspace
    const ws = await workspacesDb.get(profileId, name)
    await validateWorkspaceRecord(name, ws)

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
    assertValidProfileId(profileId)
    assertValidName(name)

    // check the filename to see if it's binary
    var isBinary = isFileNameBinary(filepath)
    if (isBinary === true) {
      throw new InvalidEncodingError('Cannot diff a binary file')
    }

    // fetch workspace
    const ws = await workspacesDb.get(profileId, name)
    await validateWorkspaceRecord(name, ws)

    // get the scoped fs and archive
    var scopedFS, archive
    await timer(3e3, async (checkin) => { // put a max 3s timeout on loading the dat
      checkin('searching for dat')
      scopedFS = scopedFSes.get(ws.localFilesPath)
      archive = await datLibrary.getOrLoadArchive(ws.publishTargetUrl)
    })

    // if we're not sure about whether it's binary, run a check on the files' buffers
    if (isBinary !== false) {
      let st
      st = await stat(scopedFS, filepath)
      if (st && st.isFile() && await isFileContentBinary(scopedFS, filepath)) {
        throw new InvalidEncodingError('Cannot diff a binary file')
      }
      st = await stat(archive, filepath)
      if (st && st.isFile() && await isFileContentBinary(archive, filepath)) {
        throw new InvalidEncodingError('Cannot diff a binary file')
      }
    }

    // read the file in both sources
    const [newFile, oldFile] = await Promise.all([readFile(scopedFS, filepath), readFile(archive, filepath)])

    // return the diff
    return diff.diffLines(oldFile, newFile)
  },

  // create a stream to watch for changes in the scoped FS
  // - profileId: number, the id of the browsing profile
  // - name: string, the name of the workspace
  async createFileActivityStream (profileId, name) {
    assertValidProfileId(profileId)
    assertValidName(name)

    // fetch workspace
    const ws = await workspacesDb.get(profileId, name)
    await validateWorkspaceRecord(name, ws)
    const scopedFS = scopedFSes.get(ws.localFilesPath)

    // create new emitter and stream
    const emitter = new EventEmitter()
    const stream = emitStream(emitter)

    // start watching
    const stopwatch = scopedFS.watch('/', path => {
      emitter.emit('changed', {path})
    })
    stream.on('close', () => {
      try { stopwatch() }
      catch (e) { /* ignore - this can happen if the workspace's path was invalid */ }
    })

    return stream
  },

  // publish the files that have changed
  // - profileId: number, the id of the browsing profile
  // - name: string, the name of the workspace
  // - opts
  //   - shallow: bool, dont descend into changed folders (default true)
  //   - compareContent: bool, compare the actual content (default true)
  //   - paths: Array<string>, a whitelist of files to compare
  async publish (profileId, name, opts={}) {
    assertValidProfileId(profileId)
    assertValidName(name)
    opts = massageDiffOpts(opts)

    // fetch workspace
    const ws = await workspacesDb.get(profileId, name)
    await validateWorkspaceRecord(name, ws)

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
    assertValidProfileId(profileId)
    assertValidName(name)
    opts = massageDiffOpts(opts)

    // fetch workspace
    const ws = await workspacesDb.get(profileId, name)
    await validateWorkspaceRecord(name, ws)

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

async function validateWorkspaceRecord (name, ws) {
  if (!ws) throw new Error(`No workspace found at ${name}`)
  if (!ws.localFilesPath) throw new Error(`No files path set for ${name}`)
  if (!ws.publishTargetUrl) throw new Error(`No target site set for ${name}`)
  await assertDatIsSavedAndOwned(ws.publishTargetUrl)
}

function assertValidProfileId (profileId) {
  if (typeof profileId !== 'number') {
    throw new Error('Must provide a valid profile id')
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

async function assertDatHasNoWorkspace (profileId, url) {
  const ws = await workspacesDb.getByPublishTargetUrl(profileId, url)
  if (ws) throw new Error('A workspace already exists for this dat')
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
  // check whether this is an OS path
  for (let i = 0; i < DISALLOWED_SAVE_PATH_NAMES.length; i++) {
    let disallowedSavePathName = DISALLOWED_SAVE_PATH_NAMES[i]
    let disallowedSavePath = app.getPath(disallowedSavePathName)
    if (path.normalize(localFilesPath) === path.normalize(disallowedSavePath)) {
      throw new ProtectedFileNotWritableError(`This is the OS ${disallowedSavePathName} folder, which is protected. Please pick another folder or subfolder.`)
    }
  }

  // stat the file
  const stat = await new Promise(resolve => {
    fs.stat(localFilesPath, (err, st) => resolve(st))
  })
  if (stat) {
    if (!stat.isDirectory()) {
      throw new NotAFolderError('Invalid target folder: not a folder')
    }
  } else {
    // create the target folder
    await new Promise((resolve, reject) => {
      mkdirp(localFilesPath, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  // check that the target folder is empty
  if (await checkFolderIsEmpty(localFilesPath) === false) {
    throw new DestDirectoryNotEmpty('Target folder must be empty')
  }
}

function assertDatUrl (url) {
  if (typeof url !== 'string' || !url.startsWith('dat://')) {
    throw new InvalidURLError('Invalid publishTargetUrl - must be a dat:// url.')
  }
}

// helper to read a file via promise and return a null on fail
async function stat (fs, filepath) {
  return new Promise(resolve => {
    fs.stat(filepath, (err, data) => {
      resolve(data || null)
    })
  })
}

// helper to read a file via promise and return an empty string on fail
async function readFile (fs, filepath) {
  return new Promise(resolve => {
    fs.readFile(filepath, {encoding: 'utf8'}, (err, data) => {
      resolve(data || '')
    })
  })
}