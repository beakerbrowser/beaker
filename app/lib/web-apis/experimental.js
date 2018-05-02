import rpc from 'pauls-electron-rpc'
import {EventTargetFromStream} from './event-target'
import errors from 'beaker-error-constants'

import experimentalLibraryManifest from '../api-manifests/external/experimental/library'

const experimental = {}
const opts = {timeout: false, errors}

// dat or internal only
if (window.location.protocol === 'beaker:' || window.location.protocol === 'dat:') {
  const libraryRPC = rpc.importAPI('experimental-library', experimentalLibraryManifest, opts)

  // experimental.library
  let libraryEvents = ['added', 'removed', 'updated', 'folder-synced', 'network-changed']
  experimental.library = new EventTargetFromStream(libraryRPC.createEventStream.bind(libraryRPC), libraryEvents)
  experimental.library.add = libraryRPC.add
  experimental.library.remove = libraryRPC.remove
  experimental.library.get = libraryRPC.get
  experimental.library.list = libraryRPC.list
  experimental.library.requestAdd = libraryRPC.requestAdd
  experimental.library.requestRemove = libraryRPC.requestRemove
}

export default experimental
