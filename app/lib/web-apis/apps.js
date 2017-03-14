import {ipcRenderer} from 'electron'
import rpc from 'pauls-electron-rpc'
import appsManifest from '../api-manifests/external/apps'
import {EventTarget, bindEventStream} from './event-target'
import errors from 'beaker-error-constants'

export default function setup() {
  // create the api
  const appsAPI = new EventTarget()
  const appsRPC = rpc.importAPI('apps', appsManifest, { timeout: false, errors })
  appsAPI.get = appsRPC.get
  appsAPI.list = appsRPC.list
  appsAPI.bind = appsRPC.bind
  appsAPI.unbind = appsRPC.unbind
  // bindEventStream(appsRPC.createEventStream(), appsAPI) TODO
  return appsAPI
}