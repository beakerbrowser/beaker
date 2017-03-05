import {app, BrowserWindow} from 'electron'
import path from 'path'

const SIZES = {
  'create-archive': {width: 500, height: 320},
  'fork-archive': {width: 500, height: 390}
}

// state
// =

var modalWindow

// exported apis
// =

export function showModal (parentWindow, modalName, opts={}) {
  if (modalWindow) {
    // TODO create a new Error type
    return Promise.reject(new Error('Modal already active'))
  }

  // create the modal window
  parentWindow = parentWindow || BrowserWindow.getFocusedWindow()
  modalWindow = new BrowserWindow({
    width: SIZES[modalName].width,
    height: SIZES[modalName].height,
    parent: parentWindow,
    modal: true,
    show: false,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'webview-preload.build.js')
    }
  })
  modalWindow.loadURL('beaker:' + modalName + '-modal')
  modalWindow.once('ready-to-show', () => {
    // inject config
    modalWindow.webContents.executeJavaScript(`
      setup(${JSON.stringify(opts)})
    `)
    modalWindow.show()
  })

  // register behaviors
  modalWindow.on('close', () => closeModal)

  // create and return the end-state promise
  modalWindow.promise = new Promise((resolve, reject) => {
    modalWindow.resolve = resolve
    modalWindow.reject = reject
  })
  return modalWindow.promise
}

export function closeModal (err, res) {
  if (!modalWindow) return true

  // resolve/reject the promise
  if (err) modalWindow.reject(err)
  else modalWindow.resolve(res)
  modalWindow.promise = null

  // destroy
  modalWindow.close()
  modalWindow = null
  return true
}