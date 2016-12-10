// json-rpc server for bkr

import jayson from 'jayson/promise'
import semver from 'semver'
import { BKR_SERVER_PORT } from '../lib/const'
import * as dat from './networks/dat/dat'
import { getActiveWindow, createShellWindow } from './ui/windows'
import { open as openUrl } from './open-url'
var packageJson = require('./package.json')
var debug = require('debug')('beaker')

const BEAKER_VERSION = packageJson.version
const MIN_BKR_VERSION = '1.1.0'

// constants
// =

const DAT_METHODS = [
  'queryArchives',
  'getArchiveDetails',
  'getArchiveStats',
  'resolveName',
  'createNewArchive',
  'forkArchive',
  'setArchiveUserSettings',
  'writeArchiveFileFromPath',
  'exportFileFromArchive'
]

// globals
// =

var server

// export api
// =

export function setup () {
  // setup the methods
  var methods = {}
  DAT_METHODS.forEach(method => {
    methods[method] = (args) => dat[method](...args).catch(massageError)
  })

  // add hello handshake
  methods.hello = ([bkrVersion]) => {
    if (!semver.valid(bkrVersion) || semver.lt(bkrVersion, MIN_BKR_VERSION)) {
      return Promise.reject({
        code: 400,
        message: `Bkr version is ${bkrVersion} and minimum required is ${MIN_BKR_VERSION}. Can you update bkr?`
      })
    }
    return Promise.resolve(BEAKER_VERSION)
  }

  // add 'openUrl' method
  methods.openUrl = ([url]) => {
    if (!url || typeof url !== 'string') return Promise.reject({ code: 400, message: `Invalid url` })
    // make sure a window is open
    if (!getActiveWindow()) createShellWindow()
    openUrl(url)
    return Promise.resolve()
  }

  // start the server
  server = jayson.server(methods).tcp()
  server.listen(BKR_SERVER_PORT, 'localhost', err => {
    if (err) console.error('Failed to create brk server', err)
    debug('bkr server running on port %d', BKR_SERVER_PORT)
  })
}

// internal methods
// =

function massageError (err) {
  throw ({ code: 400, message: err.message || err.toString() })
}