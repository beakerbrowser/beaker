import {ipcRenderer} from 'electron'
import rpc from 'pauls-electron-rpc'
import libraryManifest from '../api-manifests/external/library'
import {EventTarget, bindEventStream} from './event-target'
import errors from 'beaker-error-constants'

export default function setup() {
  // create the api
  const libraryAPI = new EventTarget()
  const libraryRPC = rpc.importAPI('library', libraryManifest, { timeout: false, errors })
  libraryAPI.list = libraryRPC.list
  libraryAPI.get = libraryRPC.get
  libraryAPI.add = libraryRPC.add
  libraryAPI.remove = libraryRPC.remove
  bindEventStream(libraryRPC.createEventStream(), libraryAPI)
  return libraryAPI
}