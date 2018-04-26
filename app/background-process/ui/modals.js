import {app, BrowserWindow} from 'electron'
import {ModalActiveError} from 'beaker-error-constants'
import path from 'path'

const SIZES = {
  'create-archive': {width: 500, height: 330},
  'fork-archive': {width: 500, height: 410},
  'basic-auth': {width: 500, height: 320},
  'select-archive': {width: 550, height: 560},
  prompt: {width: 500, height: 170},
  install: {width: 500, height: 250}
}

// state
// =

var modalWindow

// exported apis
// =

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
