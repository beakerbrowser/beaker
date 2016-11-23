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

export function getApi () {
  return ipfs
}

export function  lookupLink (folderKey, path, cb) {
  if (!ipfs) {
    debug('IPFS Daemon has not setup yet, aborting lookupLink')
    return cb({ notReady: true })
  }

  // do DNS resolution if needed
  if (folderKey.startsWith('/ipns') && !isIPFS.multihash(folderKey.slice(6))) {
    resolveDNS(folderKey, (err, resolved) => {
      if (err)
        return cb(err)
      folderKey = resolved
      start()
    })
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
          if (err.code == 'ECONNREFUSED') {
            // daemon turned off
            shutdown()
          }
          debug('no links found for', key)
          return cb(err)
        }
        
        // lookup the entry
        debug('folder listing for', key, links)
        var link = findLink(links, pathParts.shift())
        if (!link)
          return cb({ notFound: true, links })

        // done?
        if (pathParts.length === 0)
          return cb(null, link)

        // descend!
        descend(link.hash)
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

var dnsEntryRegex = /^dnslink=(\/ip[nf]s\/.*)/
function resolveDNS (folderKey, cb) {
  // pull out the name
  var name = folderKey.slice(6) // strip off the /ipns/
  if (name.endsWith('/'))
    name = name.slice(0, -1)

  // do a dns lookup
  debug('DNS TXT lookup for name:', name)
  dns.resolveTxt(name, (err, records) => {
    debug('DNS TXT results for', name, err || records)
    if (err)
      return cb(err)

    // scan the txt records for a valid entry
    for (var i=0; i < records.length; i++) {
      var match = dnsEntryRegex.exec(records[i][0])
      if (match) {
        debug('DNS resolved', name, 'to', match[1])
        return cb(null, match[1])
      }
    }

    cb({ code: 'ENOTFOUND' })
  })
}

function findLink (links, path) {
  if (!path || path == '/')          path = 'index.html'
  if (path && path.charAt(0) == '/') path = path.slice(1)
    
  for (var i=0; i < links.length; i++) {
    if (links[i].name == path)
      return links[i]
  }
}