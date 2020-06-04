import { dialog } from 'electron'
import dft from 'diff-file-tree'
import hyper from '../../hyper/index'
import * as folderSyncDb from '../../dbs/folder-sync'

const DEFAULT_IGNORED_FILES = '/index.json'

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
    var current = await folderSyncDb.get(drive.key.toString('hex'))
    if (!current) return
    return {
      localPath: current.localPath,
      ignoredFiles: (current.ignoredFiles || '').split('\n').filter(Boolean)
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
  },

  async updateIgnoredFiles (url, files) {
    var drive = await getDrive(url)
    await folderSyncDb.update(drive.key.toString('hex'), {
      ignoredFiles: files.join('\n')
    })
  },

  async remove (url) {
    var drive = await getDrive(url)
    await folderSyncDb.del(drive.key.toString('hex'))
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

  async sync (url) {
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
}

// internal methods
// =

async function getDrive (url) {
  var drive = await hyper.drives.getOrLoadDrive(url)
  if (!drive) throw new Error('Unable to load drive')
  if (!drive.writable) throw new Error('Must be a writable drive')
  return drive
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