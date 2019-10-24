Error.stackTraceLimit = Infinity
require('tls').DEFAULT_ECDH_CURVE = 'auto' // HACK (prf) fix Node 8.9.x TLS issues, see https://github.com/nodejs/node/issues/19359

// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import { app, protocol } from 'electron'
import { join } from 'path'

import { getEnvVar } from './bg/lib/env'
import * as logger from './bg/logger'
import * as beakerBrowser from './bg/browser'
import * as adblocker from './bg/adblocker'
import * as analytics from './bg/analytics'
import * as portForwarder from './bg/nat-port-forwarder'
import dbs from './bg/dbs/index'
import dat from './bg/dat/index'
import * as filesystem from './bg/filesystem/index'
import * as webapis from './bg/web-apis/bg'
import * as spellCheckerLib from './bg/lib/spell-checker'

import * as windows from './bg/ui/windows'
import * as modals from './bg/ui/subwindows/modals'
import * as windowMenu from './bg/ui/window-menu'
import registerContextMenu from './bg/ui/context-menu'
import * as downloads from './bg/ui/downloads'
import * as permissions from './bg/ui/permissions'

import * as beakerProtocol from './bg/protocols/beaker'
import * as beakerFaviconProtocol from './bg/protocols/beaker-favicon'
import * as assetProtocol from './bg/protocols/asset'
import * as intentProtocol from './bg/protocols/intent'

import * as testDriver from './bg/test-driver'
import * as openURL from './bg/open-url'

const DISALLOWED_SAVE_PATH_NAMES = [
  'home',
  'desktop',
  'documents',
  'downloads',
  'music',
  'pictures',
  'videos'
]

// setup
// =

// read config from env vars
if (getEnvVar('BEAKER_USER_DATA_PATH')) {
  console.log('User data path set by environment variables')
  console.log('userData:', getEnvVar('BEAKER_USER_DATA_PATH'))
  app.setPath('userData', getEnvVar('BEAKER_USER_DATA_PATH'))
} else {
  // DEBUG use a temporary path during the internal 0.9 beta -prf
  app.setPath('userData', join(require('os').tmpdir(), 'beaker-0.9-beta'))
}
if (getEnvVar('BEAKER_TEST_DRIVER')) {
  testDriver.setup()
}

// enable the sandbox
app.enableSandbox()

// enable process reuse to speed up navigations
// see https://github.com/electron/electron/issues/18397
app.allowRendererProcessReuse = true

// configure the protocols
protocol.registerSchemesAsPrivileged([
  {scheme: 'dat', privileges: {standard: true, secure: true, allowServiceWorkers: true, supportFetchAPI: true, corsEnabled: true}},
  {scheme: 'beaker', privileges: {standard: true, secure: true, allowServiceWorkers: true, supportFetchAPI: true, corsEnabled: true}}
])

// handle OS event to open URLs
app.on('open-url', (e, url) => {
  e.preventDefault() // we are handling it
  // wait for ready (not waiting can trigger errors)
  if (app.isReady()) openURL.open(url)
  else app.on('ready', () => openURL.open(url))
})

// handle OS event to open files
app.on('open-file', (e, filepath) => {
  e.preventDefault() // we are handling it
  // wait for ready (not waiting can trigger errors)
  if (app.isReady()) openURL.open(`file://${filepath}`)
  else app.on('ready', () => openURL.open(`file://${filepath}`))
})

app.on('ready', async function () {
  portForwarder.setup()

  // record some common opts
  var commonOpts = {
    userDataPath: app.getPath('userData'),
    homePath: app.getPath('home')
  }

  // initiate log
  await logger.setup(join(commonOpts.userDataPath, 'beaker.log'))

  // setup databases
  for (let k in dbs) {
    if (dbs[k].setup) {
      dbs[k].setup(commonOpts)
    }
  }

  // start subsystems
  // (order is important)
  await dat.setup(commonOpts)
  await filesystem.setup()
  webapis.setup()
  spellCheckerLib.setup()
  await beakerBrowser.setup()
  adblocker.setup()
  analytics.setup()

  // ui
  windowMenu.setup()
  registerContextMenu()
  windows.setup()
  downloads.setup()
  permissions.setup()

  // protocols
  beakerProtocol.setup()
  beakerFaviconProtocol.setup() // TODO deprecateme
  assetProtocol.setup()
  intentProtocol.setup()
  protocol.registerStreamProtocol('dat', dat.protocol.electronHandler, err => {
    if (err) {
      console.error(err)
      throw new Error('Failed to create protocol: dat')
    }
  })
})

app.on('quit', () => {
  portForwarder.closePort()
})

app.on('custom-ready-to-show', () => {
  // our first window is ready to show, do any additional setup
  dat.archives.loadSavedArchives()
})

// only run one instance
const isFirstInstance = app.requestSingleInstanceLock()
if (!isFirstInstance) {
  app.exit()
} else {
  handleArgv(process.argv)
  app.on('second-instance', (event, argv, workingDirectory) => {
    handleArgv(argv)

    // focus/create a window
    windows.ensureOneWindowExists()
    windows.getActiveWindow().focus()
  })
}
function handleArgv (argv) {
  if (process.platform !== 'darwin') {
    // look for URLs, windows & linux use argv instead of open-url
    let url = argv.find(v => v.indexOf('://') !== -1)
    if (url) {
      openURL.open(url)
    }
  }
}
