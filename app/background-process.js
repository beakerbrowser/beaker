Error.stackTraceLimit = Infinity

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

import * as windows from './background-process/ui/windows'
import * as modals from './background-process/ui/modals'
import * as windowMenu from './background-process/ui/window-menu'
import registerContextMenu from './background-process/ui/context-menu'
import * as downloads from './background-process/ui/downloads'
import * as permissions from './background-process/ui/permissions'
import * as basicAuth from './background-process/ui/basic-auth'

import * as beakerProtocol from './background-process/protocols/beaker'
import * as beakerFaviconProtocol from './background-process/protocols/beaker-favicon'

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

// configure the protocols
protocol.registerStandardSchemes(['dat', 'beaker'], { secure: true })

// handle OS event to open URLs
app.on('open-url', (e, url) => {
  e.preventDefault() // we are handling it
  // wait for ready (not waiting can trigger errors)
  if (app.isReady()) openURL.open(url)
  else app.on('ready', () => openURL.open(url))
})

app.on('ready', async function () {
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
      showModal: modals.showShellModal,
      capturePage: beakerBrowser.capturePage
    },
    rpcAPI: rpc,
    downloadsWebAPI: downloads.WEBAPI,
    browserWebAPI: beakerBrowser.WEBAPI
  })

  // base
  beakerBrowser.setup()
  adblocker.setup()
  analytics.setup()

  // ui
  windowMenu.setup()
  registerContextMenu()
  windows.setup()
  modals.setup()
  downloads.setup()
  permissions.setup()
  basicAuth.setup()

  // protocols
  beakerProtocol.setup()
  beakerFaviconProtocol.setup()
  protocol.registerStreamProtocol('dat', beakerCore.dat.protocol.electronHandler, err => {
    if (err) {
      console.error(err)
      throw new Error('Failed to create protocol: dat')
    }
  })

  // configure chromium's permissions for the protocols
  protocol.registerServiceWorkerSchemes(['dat'])
})

// only run one instance
const isSecondInstance = app.makeSingleInstance((argv, workingDirectory) => {
  handleArgv(argv)

  // focus/create a window
  windows.ensureOneWindowExists()
  windows.getActiveWindow().focus()
})
if (isSecondInstance) {
  app.exit()
} else {
  handleArgv(process.argv)
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
