import { ipcRenderer } from 'electron'
import { UserDeniedError } from '../lib/const'

// globals
// =

var activeReqPromises = []

// exported api
// =

export function setup () {
  if (window.location.protocol === 'dat:') {
    // attach additional methods to the dat api
    dat.createArchive = createArchive

    // wire up listeners
    ipcRenderer.on('dat-response', onResponseMessage)
  }
}

function createArchive ({ title, description, serve } = {}) {
  // send the request to the shell window
  var { reqId, promise } = allocateRequest()
  ipcRenderer.sendToHost('dat:create-archive', reqId, { title, description, serve })
  return promise
}

// internal methods
// =

// helper to create a new response-promise, for IPC
function allocateRequest () {
  var reqId = activeReqPromises.length
  var promise = new Promise((resolve, reject) => {
    activeReqPromises.push({ resolve, reject })
  })
  return { reqId, promise }
}

// resolve/reject a response-promise
function onResponseMessage (e, reqId, err, res) {
  // pull the active request
  var promise = activeReqPromises[reqId]
  if (!promise) return
  activeReqPromises[reqId] = null

  // resolve/reject
  if (err) promise.reject(lookupError(err))
  else promise.resolve(res)
}

// helper to give the proper error object
function lookupError (err) {
  if (typeof err !== 'string') return err
  if (err === 'user-denied') return new UserDeniedError()
  return new Error(err)
}