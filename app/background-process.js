Error.stackTraceLimit = Infinity
require('tls').DEFAULT_ECDH_CURVE = 'auto' // HACK (prf) fix Node 8.9.x TLS issues, see https://github.com/nodejs/node/issues/19359

// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import {app, protocol} from 'electron'
import {join} from 'path'
import * as beakerCore from '@beaker/core'
import * as rpc from 'pauls-electron-rpc'

import * as beakerBrowser from './background-process/browser'
import * as adblocker from './background-process/adblocker'
import * as analytics from './background-process/analytics'
import * as portForwarder from './background-process/nat-port-forwarder'

import * as windows from './background-process/ui/windows'
import * as modals from './background-process/ui/subwindows/modals'
import * as windowMenu from './background-process/ui/window-menu'
import registerContextMenu from './background-process/ui/context-menu'
import * as downloads from './background-process/ui/downloads'
import * as permissions from './background-process/ui/permissions'
import * as childProcesses from './background-process/child-processes'

import * as beakerProtocol from './background-process/protocols/beaker'
import * as beakerFaviconProtocol from './background-process/protocols/beaker-favicon'
import * as assetProtocol from './background-process/protocols/asset'
import * as intentProtocol from './background-process/protocols/intent'

import * as testDriver from './background-process/test-driver'
import * as openURL from './background-process/open-url'

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
if (beakerCore.getEnvVar('BEAKER_USER_DATA_PATH')) {
  console.log('User data path set by environment variables')
  console.log('userData:', beakerCore.getEnvVar('BEAKER_USER_DATA_PATH'))
  app.setPath('userData', beakerCore.getEnvVar('BEAKER_USER_DATA_PATH'))
}
if (beakerCore.getEnvVar('BEAKER_TEST_DRIVER')) {
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

  // setup core
  await beakerCore.setup({
    // paths
    userDataPath: app.getPath('userData'),
    homePath: app.getPath('home'),
    templatesPath: join(__dirname, 'assets', 'templates'),
    disallowedSavePaths: DISALLOWED_SAVE_PATH_NAMES.map(path => app.getPath(path)),

    // APIs
    permsAPI: permissions,
    uiAPI: {
      showModal: modals.create,
      capturePage: beakerBrowser.capturePage
    },
    userSessionAPI: {
      getFor: windows.getUserSessionFor
    },
    rpcAPI: rpc,
    downloadsWebAPI: downloads.WEBAPI,
    browserWebAPI: beakerBrowser.WEBAPI
  })

  // base
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
  protocol.registerStreamProtocol('dat', beakerCore.dat.protocol.electronHandler, err => {
    if (err) {
      console.error(err)
      throw new Error('Failed to create protocol: dat')
    }
  })
})

app.on('quit', () => {
  portForwarder.closePort()
  childProcesses.closeAll()
})

app.on('custom-ready-to-show', () => {
  // our first window is ready to show, do any additional setup
  beakerCore.dat.library.loadSavedArchives()
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
