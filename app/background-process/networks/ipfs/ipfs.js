import createIPFSAPI from 'ipfs-api'
import isIPFS from 'is-ipfs'
import dns from 'dns'
import path from 'path'
import fs from 'fs'
var debug = require('debug')('ipfs')

const KEYSIZE = 4096

// validation
// links can be in hex, base58, base64... probably more, but let's just handle those for now
export const LINK_REGEX = /[0-9a-z+\/=]+/i

// globals
// =

var ipfs

// exported api
// =

var isAttemptingSetup = false
export function setup () {
  if (isAttemptingSetup)
    return
  isAttemptingSetup = true

  debug('Connecting to daemon')
  ipfs = createIPFSAPI()

  // output current version
  ipfs.version()
    .then(res => {
      console.log('Connected to IPFS daemon, version', res.version)
      isAttemptingSetup = false
    })
    .catch(err => {
      console.error('[IPFS] Error fetching IPFS daemon version:', err.code || err)
      isAttemptingSetup = false
      shutdown()
    })
}

export function shutdown () {
  ipfs = null
}

export function checkIfConnectionFailed (err) {
  if (err.code == 'ECONNREFUSED') {
    // daemon turned off
    shutdown()
  }
}

export function getApi () {
  return ipfs
}

export function isDaemonActive () {
  return !!ipfs
}

export function  lookupLink (subProtocol, folderKey, path, cb) {
  if (!ipfs) {
    debug('IPFS Daemon has not setup yet, aborting lookupLink')
    return cb({ notReady: true })
  }

  // do DNS resolution if needed
  if (subProtocol === 'ipns') {
    debug('Resolving IPNS', folderKey)
    ipfs.name.resolve(folderKey).then(resolved => {
      folderKey = resolved.Path.slice(6) // slice off the subprotocol
      start()
    }).catch(cb)
  } else {
    start()
  }

  function start() {
    debug('Looking up', path, 'in', folderKey)
    var pathParts = fixPath(path).split('/')
    if (pathParts.length === 1 && !pathParts[0]) {
      // just '/'
      return cb(null, { hash: folderKey, name: '' })
    }
    descend(folderKey)

    function descend (key) {
      debug('Listing...', key)
      ipfs.object.links(key, { enc: (typeof key == 'string' ? 'base58' : false) }, (err, links) => {
        if (err) {
          checkIfConnectionFailed(err)
          debug('no links found for', key)
          return cb(err)
        }
        
        // lookup the entry
        debug('folder listing for', key, links)
        var link = findLink(links, pathParts.shift())
        if (!link) return cb({ notFound: true, links })

        // done?
        if (pathParts.length === 0) {
          return cb(null, link)
        }

        // descend!
        descend(link._multihash || link.hash)
      })
    }
  }

  function fixPath (str) {
    if (!str) str = ''
    if (str.charAt(0) == '/') str = str.slice(1)
    if (str.slice(-1) == '/') str = str.slice(0, -1)
    return str
  }
}

function findLink (links, path) {
  if (!path || path == '/')          path = 'index.html'
  if (path && path.charAt(0) == '/') path = path.slice(1)
    
  for (var i=0; i < links.length; i++) {
    let name = links[i].name || links[i]._name
    if (name === path)
      return links[i]
  }
}