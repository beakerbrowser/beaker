/**
 * This is the fs API for hostless apps.
 *
 * It should only be exposed to apps with integrity checks.
 **/

import assert from 'assert'
import fs from 'fs'
import fss from 'fs-sandbox'
import { remote } from 'electron'
import path from 'path'
import stamp from 'monotonic-timestamp'
import sitedata from './sitedata-api'

// globals
// =
var cachedUserFolders, cachedUserFolderSandboxes
var cachedUserFiles, cachedUserFileSandboxes
var isOpening = false

// exported api
// =

export function setup () {

}

export function getSandboxAPI () {
  return sandboxAPI
}

// internal methods
// =

var sandboxAPI = {
  getAppFolder() {
    // construct paths
    const { app } = remote
    var siteFilesPath = path.join(app.getPath('userData'), 'SiteFiles')
    var appFolderPath = path.join(siteFilesPath, getAppId())

    // make sure the folder exists
    // (TODO: is it a problem to do this sync?)
    try       { fs.statSync(siteFilesPath) }
    catch (e) { fs.mkdirSync(siteFilesPath) }
    try       { fs.statSync(appFolderPath) }
    catch (e) { fs.mkdirSync(appFolderPath) }

    // return the sandbox
    return fss.createFolderSandbox(appFolderPath)
  },

  getUserFolders(cb) {
    assert(typeof cb == 'function', 'Parameter 1 must be a callback')

    // use cache if available
    if (cachedUserFolderSandboxes)
      return cb(null, cachedUserFolderSandboxes)

    // fetch from sitedata
    sitedata.get('user-folders', (err, folders) => {
      // parse the json
      try { folders = JSON.parse(folders) || [] }
      catch (e) { folders = [] }

      // create sandboxes
      cachedUserFolders = folders
      cachedUserFolderSandboxes = folders.map(createFolderSandbox).filter(Boolean) // filter out failed opens
      cb(null, cachedUserFolderSandboxes)
    })
  },

  getUserFiles(cb) {
    assert(typeof cb == 'function', 'Parameter 1 must be a callback')

    // use cache if available
    if (cachedUserFileSandboxes)
      return cb(null, cachedUserFileSandboxes)

    // fetch from sitedata
    sitedata.get('user-files', (err, files) => {
      // parse the json
      try { files = JSON.parse(files) || [] }
      catch (e) { files = [] }

      // create sandboxes
      cachedUserFiles = files
      cachedUserFileSandboxes = files.map(createFileSandbox).filter(Boolean) // filter out failed opens
      cb(null, cachedUserFileSandboxes)
    })
  },

  requestFolder(id, promptOptions, cb) {
    const { dialog } = remote
    if (arguments.length == 2) {
      cb = promptOptions
      promptOptions = id
      id = null
    }
    assert(promptOptions && typeof promptOptions == 'object', 'Must provide an options object')
    assert(typeof cb == 'function', 'Must provide a callback')

    // get the user's folders
    sandboxAPI.getUserFolders((err, folders) => {
      // check if the folder is already available
      if (id) {
        var folder = folders.find(f => f.id == id)
        if (folder) return cb(null, folder)
      }

      // ask the user for the folder
      var properties = ['openDirectory', 'createDirectory']
      if (promptOptions.multi)
        properties.push('multiSelections')
      dialog.showOpenDialog({ title: promptOptions.title, properties }, folderPaths => {
        // no selection?
        if (!folderPaths)
          return cb()

        // add to the user folders
        var newFolders = folderPaths.map(folderPath => ({ id: stamp(), path: folderPath }))
        cachedUserFolders = cachedUserFolders.concat(newFolders)
        sitedata.set('user-folders', JSON.stringify(cachedUserFolders), err => {
          if (err)
            console.warn('Failed to save user-folders to sitedata', err)

          // create sandboxes
          var newFolderSandboxes = newFolders.map(createFolderSandbox).filter(Boolean)
          cachedUserFolderSandboxes = cachedUserFolderSandboxes.concat(newFolderSandboxes)
          if (!promptOptions.multi)
            newFolderSandboxes = newFolderSandboxes[0]
          cb(null, newFolderSandboxes)
        })

      })
    })
  },

  requestFile(id, flags, promptOptions, cb) {
    const { dialog } = remote
    if (arguments.length == 3) {
      cb = promptOptions
      promptOptions = flags
      flags = id
      id = null
    }
    assert(typeof flags == 'string', 'Must provide flags')
    assert(promptOptions && typeof promptOptions == 'object', 'Must provide an options object')
    assert(typeof cb == 'function', 'Must provide a callback')

    // get the user's files
    sandboxAPI.getUserFiles((err, files) => {
      // check if the file is already available
      if (id) {
        var file = files.find(f => f.id == id)
        if (file) return cb(null, file)
      }

      // ask the user for the file
      var properties = ['openFile', 'createDirectory']
      if (promptOptions.multi)
        properties.push('multiSelections')
      const showDialog = (promptOptions.type == 'save') ? dialog.showSaveDialog : dialog.showOpenDialog
      showDialog.call(dialog, { title: promptOptions.title, filters: promptOptions.filters, properties }, filePaths => {
        // no selection?
        if (!filePaths)
          return cb()

        // add to the user files
        var newFiles = filePaths.map(filePath => ({ id: stamp(), path: filePath, flags }))
        cachedUserFiles = cachedUserFiles.concat(newFiles)
        sitedata.set('user-files', JSON.stringify(cachedUserFiles), err => {
          if (err)
            console.warn('Failed to save user-files to sitedata', err)

          // create sandboxes
          var newFileSandboxes = newFiles.map(createFileSandbox).filter(Boolean)
          cachedUserFileSandboxes = cachedUserFileSandboxes.concat(newFileSandboxes)
          if (!promptOptions.multi)
            newFileSandboxes = newFileSandboxes[0]
          cb(null, newFileSandboxes)
        })

      })
    })
  },

  releaseFolder(folder, cb) {
    var id = folder
    if (folder && folder.id)
      id = folder.id
    assert(id, 'Folder or folder ID must be provided')

    // get the user's folders
    sandboxAPI.getUserFolders((err, folders) => {

      // filter out this entry
      cachedUserFolders = folders.filter(f => f.id != id)
      cachedUserFolderSandboxes = cachedUserFolderSandboxes.filter(f => f.id != id)

      // save
      sitedata.set('user-folders', JSON.stringify(cachedUserFolders), err => {
        if (err)
          console.warn('Failed to save user-folders to sitedata', err)

        cb && cb()
      })
    })
  },

  releaseFile(file, cb) {
    var id = file
    if (file && file.id)
      id = file.id
    assert(id, 'File or file ID must be provided')

    // get the user's files
    sandboxAPI.getUserFiles((err, files) => {

      // filter out this entry
      cachedUserFiles = files.filter(f => f.id != id)
      cachedUserFileSandboxes = cachedUserFileSandboxes.filter(f => f.id != id)

      // save
      sitedata.set('user-files', JSON.stringify(cachedUserFiles), err => {
        if (err)
          console.warn('Failed to save user-files to sitedata', err)

        cb && cb()
      })
    })
  },
}

function createFolderSandbox (folder) {
  if (!folder || !folder.path) // corrupted entry
    return null

  var sandbox = fss.createFolderSandbox(folder.path)
  Object.defineProperty(sandbox, 'id', { get: () => folder.id })
  return sandbox
}

function createFileSandbox (file) {
  if (!file || !file.path) // corrupted entry
    return null

  // try to open the file
  var fd
  try { fd = fs.openSync(file.path, file.flags) }
  catch (e) { 
    console.warn('Prior user-file failed to open', file.id, e.toString())
    return null
  }

  // create the sandbox
  var sandbox = fss.createFileSandbox(fd, file.path)
  Object.defineProperty(sandbox, 'id', { get: () => file.id })
  return sandbox
}

function getAppId () {
  var scheme = window.location.protocol
  if (scheme == 'dat:' || scheme == 'beaker:') {
    // drop the ':'
    scheme = scheme.slice(0, -1)
    // pathname will be '//{hash_or_name}/{...}''
    // lets reduce it to {hash_or_name}
    var name = window.location.pathname.slice(2)
    name = name.slice(0, name.indexOf('/'))
    // final = '{scheme}_{hash_or_name}'
    return scheme + '_' + name
  }
  throw 'Invalid protocol'
}