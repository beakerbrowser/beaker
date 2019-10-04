import errors from 'beaker-error-constants'
import { EventTargetFromStream } from './event-target'

const RPC_OPTS = { timeout: false, errors }
import bookmarks from '../manifests/external/unwalled-garden-bookmarks'
import comments from '../manifests/external/unwalled-garden-comments'
import follows from '../manifests/external/unwalled-garden-follows'
import library from '../manifests/external/unwalled-garden-library'
import statuses from '../manifests/external/unwalled-garden-statuses'
import profiles from '../manifests/external/unwalled-garden-profiles'
import reactions from '../manifests/external/unwalled-garden-reactions'
import votes from '../manifests/external/unwalled-garden-votes'
const APIs = {
  bookmarks: {
    manifest: bookmarks,
    create: makeCreateFn('unwalled-garden-bookmarks')
  },
  comments: {
    manifest: comments,
    create: makeCreateFn('unwalled-garden-comments')
  },
  follows: {
    manifest: follows,
    create: makeCreateFn('unwalled-garden-follows')
  },
  library: {
    manifest: library,
    create: makeCreateFn('unwalled-garden-library')
  },
  statuses: {
    manifest: statuses,
    create: makeCreateFn('unwalled-garden-statuses')
  },
  profiles: {
    manifest: profiles,
    create: makeCreateFn('unwalled-garden-profiles')
  },
  reactions: {
    manifest: reactions,
    create: makeCreateFn('unwalled-garden-reactions')
  },
  votes: {
    manifest: votes,
    create: makeCreateFn('unwalled-garden-votes')
  }
}

export const setup = function (rpc) {
  const uwg = {}
  for (let name in APIs) {
    uwg[name] = APIs[name].create(name, rpc)
  }
  return uwg
}

function makeCreateFn (channel) {
  return (name, rpc) => {
    var rpcInst = rpc.importAPI(channel, APIs[name].manifest, RPC_OPTS)
    var api = {}
    for (let method in APIs[name].manifest) {
      api[method] = rpcInst[method].bind(api)
    }
    return api
  }
}