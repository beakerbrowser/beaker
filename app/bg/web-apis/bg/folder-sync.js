import { dialog } from 'electron'
import dft from 'diff-file-tree'
import watch from 'recursive-watch'
import _debounce from 'lodash.debounce'
import hyper from '../../hyper/index'
import * as folderSyncDb from '../../dbs/folder-sync'

const DEFAULT_IGNORED_FILES = '/index.json'

// globals
// =

var activeAutoSyncs = {} // {[key]: {stopwatch, ignoredFiles}

// exported api
// =

export default {
  async configureDialog (url) {
    var drive = await getDrive(url)
    var key = drive.key.toString('hex')
    var current = await folderSyncDb.get(key)
    var res = await dialog.showOpenDialog({
      title: 'Select folder to sync',
      buttonLabel: 'Select Folder',
      defaultPath: current ? current.localPath : undefined,
      properties: ['openDirectory', 'createDirectory']
    })
    if (res.filePaths.length !== 1) return current ? current.localPath : undefined
    if (current) {
      await folderSyncDb.update(key, {
        localPath: res.filePaths[0],
        ignoredFiles: DEFAULT_IGNORED_FILES
      })
    } else {
      await folderSyncDb.insert(key, {
        localPath: res.filePaths[0],
        ignoredFiles: DEFAULT_IGNORED_FILES
      })
    }
    return res.filePaths[0]
  },

  async get (url) {
    var drive = await getDrive(url)
    var key = drive.key.toString('hex')
    var current = await folderSyncDb.get(key)
    if (!current) return
    return {
      localPath: current.localPath,
      ignoredFiles: (current.ignoredFiles || '').split('\n').filter(Boolean),
      isAutoSyncing: (key in activeAutoSyncs)
    }
  },

  async set (url, values) {
    var drive = await getDrive(url)
    var key = drive.key.toString('hex')
    var current = await folderSyncDb.get(key)
    if (!values.ignoredFiles) values.ignoredFiles = DEFAULT_IGNORED_FILES
    if (current) {
      await folderSyncDb.update(key, values)
    } else {
      await folderSyncDb.insert(key, values)
    }
    stopAutosync(key)
  },

  async updateIgnoredFiles (url, files) {
    var drive = await getDrive(url)
    var key = drive.key.toString('hex')
    await folderSyncDb.update(key, {
      ignoredFiles: files.join('\n')
    })
    if (activeAutoSyncs[key]) {
      activeAutoSyncs[key].ignoredFiles = files
    }
  },

  async remove (url) {
    var drive = await getDrive(url)
    var key = drive.key.toString('hex')
    await folderSyncDb.del(key)
    stopAutosync(key)
  },

  async compare (url) {
    var drive = await getDrive(url)
    var current = await folderSyncDb.get(drive.key.toString('hex'))
    if (!current || !current.localPath) return []
    return dft.diff(
      current.localPath,
      {fs: drive.session.drive, path: '/'},
      {shallow: true, compareContent: true}
    )
  },

  sync,

  async enableAutoSync (url) {
    var drive = await getDrive(url)
    var key = drive.key.toString('hex')
    var current = await folderSyncDb.get(drive.key.toString('hex'))
    if (!current || !current.localPath) return
    stopAutosync(key)
    startAutosync(key, current)
  },

  async disableAutoSync (url) {
    var drive = await getDrive(url)
    stopAutosync(drive.key.toString('hex'))
  }
}

// internal methods
// =

async function getDrive (url) {
  var drive = await hyper.drives.getOrLoadDrive(url)
  if (!drive) throw new Error('Unable to load drive')
  if (!drive.writable) throw new Error('Must be a writable drive')
  return drive
}

async function sync (url) {
  var drive = await getDrive(url)
  var current = await folderSyncDb.get(drive.key.toString('hex'))
  if (!current || !current.localPath) return []
  var diff = await dft.diff(
    current.localPath,
    {fs: drive.session.drive, path: '/'},
    {compareContent: true, filter: createIgnoreFilter(current.ignoredFiles)}
  )
  return dft.applyRight(current.localPath, {fs: drive.session.drive, path: '/'}, diff)
}

function startAutosync (key, current) {
  var syncDebounced = _debounce(sync, 500)
  var ctx = {
    ignoredFiles: current.ignoredFiles.split('\n'),
    stopwatch: watch(current.localPath, filename => {
      filename = filename.slice(current.localPath.length)
      if (ctx.ignoredFiles.includes(filename)) return
      syncDebounced(key)
    })
  }
  activeAutoSyncs[key] = ctx
}

function stopAutosync (key) {
  if (activeAutoSyncs[key]) {
    activeAutoSyncs[key].stopwatch()
    delete activeAutoSyncs[key]
  }
}

function createIgnoreFilter (ignoredFiles) {
  ignoredFiles = (ignoredFiles || '').split('\n').filter(Boolean)
  if (ignoredFiles.length === 0) return
  return (filepath) => {
    for (let ignoredFile of ignoredFiles) {
      if (filepath === ignoredFile) return true
      if (filepath.startsWith(ignoredFile) && filepath.charAt(ignoredFile.length) === '/') {
        return true // a parent folder
      }
    }
    return false
  }
}