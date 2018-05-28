import {app, BrowserWindow, ipcMain, webContents as electronWebContents} from 'electron'
import {ModalActiveError} from 'beaker-error-constants'
import path from 'path'

const SIZES = {
  'basic-auth': {width: 500, height: 320},
  prompt: {width: 500, height: 170},
  install: {width: 500, height: 250}
}

// globals
// =

var modalWindow
var reqIdCounter = 0
var activeRequests = []

// exported apis
// =

export function setup () {
  // wire up handlers
  ipcMain.on('modal-response', onModalResponse)
}

export function showModal (parentWindow, modalName, opts = {}) {
  if (modalWindow) {
    return Promise.reject(new ModalActiveError())
  }

  // create the modal window
  parentWindow = parentWindow || BrowserWindow.getFocusedWindow()
  let x, y, width, height
  width = SIZES[modalName].width
  height = SIZES[modalName].height
  if (parentWindow) {
    let b = parentWindow.getBounds()
    x = (b.x + (b.width / 2) - (width / 2))
    y = b.y + 40
  }
  modalWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    parent: parentWindow,
    autoHideMenuBar: true,
    modal: true,
    show: false,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'webview-preload.build.js')
    }
  })
  modalWindow.loadURL('beaker://' + modalName + '-modal')
  modalWindow.once('ready-to-show', () => {
    // inject config
    modalWindow.webContents.executeJavaScript(`
      setup(${JSON.stringify(opts)})
    `)
    modalWindow.show()
  })

  // register behaviors
  modalWindow.on('close', closeModal)

  // create and return the end-state promise
  modalWindow.promise = new Promise((resolve, reject) => {
    modalWindow.resolve = resolve
    modalWindow.reject = reject
  })
  return modalWindow.promise
}

export function closeModal (err, res) {
  if (!modalWindow) return true
  var w = modalWindow
  modalWindow = null

  // resolve/reject the promise
  if (err) w.reject(err)
  else w.resolve(res)
  w.promise = null

  // destroy
  w.close()
  return true
}

export function showShellModal (webContents, modalName, opts = {}) {
  return new Promise(async (resolve, reject) => {
    // sanity check
    if (!webContents.hostWebContents) {
      // get the active tab's webcontents
      try {
        let wcID = await webContents.executeJavaScript(`pages.getActive().wcID`)
        webContents = electronWebContents.fromId(wcID)
        if (!webContents) throw new Error('Web Contents not found')
      } catch (e) {
        console.error('Warning: showShellModal() was passed the webContents of a non page, and failed to fetch the current page', e)
        return reject('Invalid shell modal target')
      }
    }

    // modal already active?
    if (activeRequests.find(r => r.webContents === webContents)) {
      return reject(new ModalActiveError())
    }

    // track the new request
    var req = {id: ++reqIdCounter, resolve, reject, webContents}
    activeRequests.push(req)

    // send message to create the UI
    webContents.hostWebContents.send('command', 'show-modal', req.id, webContents.id, modalName, opts)
  })
}

// internal methods
// =

async function onModalResponse (e, reqId, err, res) {
  // lookup the request
  var req = activeRequests.find(req => req.id == reqId)
  if (!req) { return console.error('Warning: failed to find modal request for response #' + reqId) }

  // untrack
  activeRequests.splice(activeRequests.indexOf(req), 1)

  // finish
  if (err) req.reject(new Error(err))
  else req.resolve(res)
}
