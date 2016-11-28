// json-rpc server for bkr

import jayson from 'jayson/promise'
import { BKR_SERVER_PORT } from '../lib/const'
import * as dat from './networks/dat/dat'
var debug = require('debug')('beaker')

// constants
// =

const METHODS = [
  'queryArchives',
  'getArchiveDetails',
  'getArchiveStats',
  'resolveName',
  'createNewArchive',
  'forkArchive',
  'setArchiveUserSettings',
  'writeArchiveFileFromPath',
]

// globals
// =

var server

// export api
// =

export function setup () {
  // setup the methods
  var methods = {}
  METHODS.forEach(method => {
    methods[method] = (args) => dat[method](...args)
  })

  // start the server
  server = jayson.server(methods).tcp()
  server.listen(BKR_SERVER_PORT, 'localhost', err => {
    if (err) console.error('Failed to create brk server', err)
    debug('bkr server running on port %d', BKR_SERVER_PORT)
  })
}