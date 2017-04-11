// json-rpc server for bkr

import jayson from 'jayson/promise'
import semver from 'semver'
import pda from 'pauls-dat-api'
import { BrowserWindow } from 'electron'
import { BKR_SERVER_PORT } from '../lib/const'
import * as datLibrary from './networks/dat/library'
import { getActiveWindow, createShellWindow } from './ui/windows'
import { open as openUrl } from './open-url'
import * as archivesDb from './dbs/archives'
var packageJson = require('./package.json')
var debug = require('debug')('beaker')

const BEAKER_VERSION = packageJson.version
const MIN_BKR_VERSION = '2.0.0'

// globals
// =

var server

// export api
// =

export function setup () {
  // copy methods from datLibrary
  var methods = {}
  ;['queryArchives',
    'createNewArchive',
    'forkArchive',
    'getArchiveInfo'
  ].forEach(method => {
    methods[method] = (args) => datLibrary[method](...args).catch(massageError)
  })

  // handshake method
  methods.hello = ([bkrVersion]) => {
    if (!semver.valid(bkrVersion) || semver.lt(bkrVersion, MIN_BKR_VERSION)) {
      return Promise.reject({
        code: 400,
        message: `Bkr version is ${bkrVersion} and minimum required is ${MIN_BKR_VERSION}. Please update bkr!`
      })
    }
    return Promise.resolve(BEAKER_VERSION)
  }

  methods.openUrl = ([url]) => {
    if (!url || typeof url !== 'string') return Promise.reject({ code: 400, message: `Invalid url` })
    // make sure a window is open
    if (!getActiveWindow()) createShellWindow()
    const wc = openUrl(url)
    if (wc) {
      BrowserWindow.fromWebContents(wc).focus()
    }
    return Promise.resolve()
  }

  methods.loadDat = ([key]) => {
    datLibrary.getOrLoadArchive(key)
    return Promise.resolve()
  }

  methods.downloadArchive = ([key]) => {
    var archive = datLibrary.getArchive(key)
    return pda.download(archive)
  }

  methods.setArchiveUserSettings = ([key, settings]) => {
    return archivesDb.setUserSettings(0, key, settings)
  }

  methods.writeArchiveFileFromPath = ([dstKey, opts]) => {
    var dstArchive = datLibrary.getArchive(dstKey)
    return pda.exportFilesystemToArchive({
      srcPath: opts.src,
      dstArchive,
      dstPath: opts.dst,
      ignore: opts.ignore,
      dryRun: opts.dryRun,
      inplaceImport: opts.inplaceImport
    })
  }

  methods.exportFileFromArchive = ([srcKey, srcPath, dstPath]) => {
    var srcArchive = datLibrary.getArchive(srcKey)
    return pda.exportArchiveToFilesystem({
      srcArchive,
      srcPath,
      dstPath,
      overwriteExisting: true,
      skipUndownloadedFiles: true
    })
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