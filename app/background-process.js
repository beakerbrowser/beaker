Error.stackTraceLimit = Infinity
import setupDebugLogger from './background-process/debug-logger'

// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import { app, protocol } from 'electron'

import * as beakerBrowser from './background-process/browser'
import * as webAPIs from './background-process/web-apis'

import * as windows from './background-process/ui/windows'
import * as windowMenu from './background-process/ui/window-menu'
import registerContextMenu from './background-process/ui/context-menu'
import * as downloads from './background-process/ui/downloads'
import * as permissions from './background-process/ui/permissions'
import * as basicAuth from './background-process/ui/basic-auth'

import * as archives from './background-process/dbs/archives'
import * as settings from './background-process/dbs/settings'
import * as sitedata from './background-process/dbs/sitedata'
import * as profileDataDb from './background-process/dbs/profile-data-db'
import * as bookmarksDb from './background-process/dbs/bookmarks'

import * as beakerProtocol from './background-process/protocols/beaker'
import * as beakerFaviconProtocol from './background-process/protocols/beaker-favicon'
import * as datProtocol from './background-process/protocols/dat'
import * as appProtocol from './background-process/protocols/app'

import * as profiles from './background-process/injests/profiles'

import * as openURL from './background-process/open-url'

// read config from env vars
setupDebugLogger()
if (process.env.beaker_user_data_path) {
  console.log('User data path set by environment variables')
  console.log('userData:', process.env.beaker_user_data_path)
  app.setPath('userData', process.env.beaker_user_data_path)
}

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
})

// configure the protocols
protocol.registerStandardSchemes(['dat', 'beaker', 'app'], { secure: true })

app.on('ready', async function () {
  // databases
  archives.setup()
  settings.setup()
  sitedata.setup()
  profileDataDb.setup()
  // TEMP can probably remove this in 2018 or so -prf
  bookmarksDb.fixOldBookmarks()

  // base
  beakerBrowser.setup()

  // ui
  windowMenu.setup()
  registerContextMenu()
  windows.setup()
  downloads.setup()
  permissions.setup()
  basicAuth.setup()

  // protocols
  beakerProtocol.setup()
  beakerFaviconProtocol.setup()
  datProtocol.setup()
  appProtocol.setup()

  // configure chromium's permissions for the protocols
  protocol.registerServiceWorkerSchemes(['dat', 'app'])

  // web APIs
  webAPIs.setup()

  // injests
  await profiles.setup()

  // listen OSX open-url event
  openURL.setup()
})
