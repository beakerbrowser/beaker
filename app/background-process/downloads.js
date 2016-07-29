import path from 'path'
import { app, dialog } from 'electron'
import unusedFilename from 'unused-filename'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import rpc from 'pauls-electron-rpc'
import manifest from '../lib/rpc-manifests/downloads'

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
  // wire up RPC
  rpc.exportAPI('downloads', manifest, { eventsStream, getDownloads, pause, resume, cancel })
}

export function registerListener (win, opts = {}) {
  const listener = (e, item, webContents) => {
    // build a path to an unused name in the downloads folder
    const filePath = unusedFilename.sync(path.join(app.getPath('downloads'), item.getFilename()))

    // track as an active download
    item.id = (''+Date.now())+(''+Math.random()) // pretty sure this is collision proof but replace if not -prf
    item.name = path.basename(filePath)
    downloads.push(item)
    downloadsEvents.emit('new-download', toJSON(item))

    // destination override
    if (!opts.saveAs) {
      item.setSavePath(filePath)
    }

    // TODO: use mime type checking for file extension when no extension can be inferred
    // item.getMimeType()

    // update dock-icon progress bar
    item.on('updated', () => {
      var sumProgress = {
        receivedBytes: getSumReceivedBytes(),
        totalBytes: getSumTotalBytes()
      }
      downloadsEvents.emit('updated', toJSON(item))
      downloadsEvents.emit('sum-progress', sumProgress)
      win.setProgressBar(sumProgress.receivedBytes / sumProgress.totalBytes)
    })

    item.on('done', (e, state) => {
      downloadsEvents.emit('done', toJSON(item))

      // replace entry with a clone that captures the final state
      downloads.splice(downloads.indexOf(item), 1, capture(item))

      // reset progress bar when done
      if (isNoActiveDownloads() && !win.isDestroyed()) {
        win.setProgressBar(-1)
      }

      // inform users of error conditions
      if (state === 'interrupted') {
        dialog.showErrorBox('Download error', `The download of ${item.getFilename()} was interrupted`)
      }

      if (state === 'completed') {
        // flash the dock on osx
        if (process.platform === 'darwin') {
          app.dock.downloadFinished(filePath)
        }

        // optional, for one-time downloads
        if (opts.unregisterWhenDone) {
          webContents.session.removeListener('will-download', listener)
        }
      }
    })
  }

  win.webContents.session.on('will-download', listener)
}

export function download (win, url, opts) {
  // register for onetime use of the download system
  opts = Object.assign({}, opts, {unregisterWhenDone: true})
  registerListener(win, opts)
  win.webContents.downloadURL(url)
}

// rpc api
// =

function eventsStream () {
  return emitStream(downloadsEvents)
}

function getDownloads () {
  return downloads.map(toJSON)
}

function pause (id) {
  var download = downloads.find(d => d.id == id)
  if (download)
    download.pause()
}

function resume (id) {
  var download = downloads.find(d => d.id == id)
  if (download)
    download.resume()
}

function cancel (id) {
  var download = downloads.find(d => d.id == id)
  if (download)
    download.cancel()  
}

// internal helpers
// =

// reduce down to attributes
function toJSON (item) {
  return {
    id: item.id,
    name: item.name,
    url: item.getURL(),
    state: item.getState(),
    isPaused: item.isPaused(),
    receivedBytes: item.getReceivedBytes(),
    totalBytes: item.getTotalBytes()
  }
}

// create a capture of the final state of an item
function capture (item) {
  item = toJSON(item)
  item.getURL = () => item.url
  item.getState = () => item.state
  item.isPaused = () => false
  item.getReceivedBytes = () => item.receivedBytes
  item.getTotalBytes = () => item.totalBytes
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