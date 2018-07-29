import path from 'path'
import fs from 'fs'
import { app, dialog, shell, webContents } from 'electron'
import mime from 'mime'
import unusedFilename from 'unused-filename'
import speedometer from 'speedometer'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import parseDataURL from 'data-urls'
import {requestPermission} from './permissions'

// globals
// =

// downloads list
// - shared across all windows
var downloads = []

// used for rpc
var downloadsEvents = new EventEmitter()

// exported api
// =

export function setup () {
}

export const WEBAPI = { createEventsStream, getDownloads, pause, resume, cancel, remove, open, showInFolder }

export function registerListener (win, opts = {}) {
  const listener = async (e, item, wc) => {
    // dont touch if already being handled
    // - if `opts.saveAs` is being used, there may be multiple active event handlers
    if (item.isHandled) { return }

    // build a path to an unused name in the downloads folder
    let filePath = opts.saveAs ? opts.saveAs : unusedFilename.sync(path.join(app.getPath('downloads'), item.getFilename()))

    // track as an active download
    item.id = ('' + Date.now()) + ('' + Math.random()) // pretty sure this is collision proof but replace if not -prf
    item.name = path.basename(filePath)
    if (item.name.split('.').length < 2 && item.getMimeType()) {
      const ext = `.${mime.extension(item.getMimeType())}`
      if (ext !== '.bin') {
        item.name += ext
        filePath += ext
      }
    }
    item.setSavePath(filePath)
    item.isHandled = true
    item.downloadSpeed = speedometer()

    if (!opts.trusted) {
      item.pause()
      var allowed = await requestPermission('download', wc, {url: item.getURL(), filename: item.name})
      if (!allowed) {
        item.cancel()
        return
      }
      item.resume()
    }

    downloads.push(item)
    downloadsEvents.emit('new-download', toJSON(item))

    // update dock-icon progress bar
    var lastBytes = 0
    item.on('updated', () => {
      var sumProgress = {
        receivedBytes: getSumReceivedBytes(),
        totalBytes: getSumTotalBytes()
      }

      // track rate of download
      item.downloadSpeed(item.getReceivedBytes() - lastBytes)
      lastBytes = item.getReceivedBytes()

      // emit
      downloadsEvents.emit('updated', toJSON(item))
      downloadsEvents.emit('sum-progress', sumProgress)
      win.setProgressBar(sumProgress.receivedBytes / sumProgress.totalBytes)
    })

    item.on('done', (e, state) => {
      // inform users of error conditions
      var overrides = false
      if (state === 'interrupted') {
        // this can sometimes happen because the link is a data: URI
        // in that case, we can manually parse and save it
        if (item.getURL().startsWith('data:')) {
          let parsed = parseDataURL(item.getURL())
          if (parsed) {
            fs.writeFileSync(filePath, parsed.body)
            overrides = {
              state: 'completed',
              receivedBytes: parsed.body.length,
              totalBytes: parsed.body.length
            }
          }
        }
        if (!overrides) {
          dialog.showErrorBox('Download error', `The download of ${item.getFilename()} was interrupted`)
        }
      }

      downloadsEvents.emit('done', toJSON(item, overrides))

      // replace entry with a clone that captures the final state
      downloads.splice(downloads.indexOf(item), 1, capture(item, overrides))

      // reset progress bar when done
      if (isNoActiveDownloads() && !win.isDestroyed()) {
        win.setProgressBar(-1)
      }

      if (state === 'completed') {
        // flash the dock on osx
        if (process.platform === 'darwin') {
          app.dock.downloadFinished(filePath)
        }
      }

      // optional, for one-time downloads
      if (opts.unregisterWhenDone) {
        wc.session.removeListener('will-download', listener)
      }
    })
  }

  win.webContents.session.prependListener('will-download', listener)
  win.on('close', () => win.webContents.session.removeListener('will-download', listener))
}

export function download (win, wc, url, opts) {
  // register for onetime use of the download system
  opts = Object.assign({}, opts, {unregisterWhenDone: true, trusted: true})
  registerListener(win, opts)
  wc.downloadURL(url)
}

// rpc api
// =

function createEventsStream () {
  return emitStream(downloadsEvents)
}

function getDownloads () {
  return Promise.resolve(downloads.map(toJSON))
}

function pause (id) {
  var download = downloads.find(d => d.id == id)
  if (download) { download.pause() }
  return Promise.resolve()
}

function resume (id) {
  var download = downloads.find(d => d.id == id)
  if (download) { download.resume() }
  return Promise.resolve()
}

function cancel (id) {
  var download = downloads.find(d => d.id == id)
  if (download) { download.cancel() }
  return Promise.resolve()
}

function remove (id) {
  var download = downloads.find(d => d.id == id)
  if (download && download.getState() != 'progressing') { downloads.splice(downloads.indexOf(download), 1) }
  return Promise.resolve()
}

function open (id) {
  return new Promise((resolve, reject) => {
    // find the download
    var download = downloads.find(d => d.id == id)
    if (!download || download.state != 'completed') { return reject() }

    // make sure the file is still there
    fs.stat(download.getSavePath(), err => {
      if (err) { return reject() }

      // open
      shell.openItem(download.getSavePath())
      resolve()
    })
  })
}

function showInFolder (id) {
  return new Promise((resolve, reject) => {
    // find the download
    var download = downloads.find(d => d.id == id)
    if (!download || download.state != 'completed') { return reject() }

    // make sure the file is still there
    fs.stat(download.getSavePath(), err => {
      if (err) { return reject() }

      // open
      shell.showItemInFolder(download.getSavePath())
      resolve()
    })
  })
}

// internal helpers
// =

// reduce down to attributes
function toJSON (item, overrides) {
  return {
    id: item.id,
    name: item.name,
    url: item.getURL(),
    state: overrides ? overrides.state : item.getState(),
    isPaused: item.isPaused(),
    receivedBytes: overrides ? overrides.receivedBytes : item.getReceivedBytes(),
    totalBytes: overrides ? overrides.totalBytes : item.getTotalBytes(),
    downloadSpeed: item.downloadSpeed()
  }
}

// create a capture of the final state of an item
function capture (item, overrides) {
  var savePath = item.getSavePath()
  var dlspeed = item.download
  item = toJSON(item, overrides)
  item.getURL = () => item.url
  item.getState = () => overrides === true ? 'completed' : item.state
  item.isPaused = () => false
  item.getReceivedBytes = () => overrides ? overrides.receivedBytes : item.receivedBytes
  item.getTotalBytes = () => overrides ? overrides.totalBytes : item.totalBytes
  item.getSavePath = () => savePath
  item.downloadSpeed = () => dlspeed
  return item
}

// sum of received bytes
function getSumReceivedBytes () {
  return getActiveDownloads().reduce((acc, item) => acc + item.getReceivedBytes(), 0)
}

// sum of total bytes
function getSumTotalBytes () {
  return getActiveDownloads().reduce((acc, item) => acc + item.getTotalBytes(), 0)
}

function getActiveDownloads () {
  return downloads.filter(d => d.getState() == 'progressing')
}

// all downloads done?
function isNoActiveDownloads () {
  return getActiveDownloads().length === 0
}
