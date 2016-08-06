// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import { app, Menu } from 'electron'
import log from 'loglevel'
import env from './env'

import * as windows from './background-process/windows'
import buildWindowMenu from './background-process/window-menu'
import registerContextMenu from './background-process/context-menu'
import * as webAPIs from './background-process/web-apis'
import * as sitedata from './background-process/sitedata'
import * as bookmarks from './background-process/bookmarks'
import * as history from './background-process/history'
import * as downloads from './background-process/downloads'
import * as pluginModules from './background-process/plugin-modules'

import * as beakerProtocol from './background-process/protocols/beaker'
import * as beakerFaviconProtocol from './background-process/protocols/beaker-favicon'

// configure logging
log.setLevel('trace')

// load the installed protocols
pluginModules.registerStandardSchemes()

app.on('ready', function () {
  // base
  pluginModules.setup()

  // ui
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildWindowMenu(env)))
  registerContextMenu()
  windows.setup()

  // databases
  sitedata.setup()
  bookmarks.setup()
  history.setup()
  downloads.setup()

  // protocols
  beakerProtocol.setup()
  beakerFaviconProtocol.setup()
  pluginModules.setupProtocolHandlers()

  // web APIs
  webAPIs.setup()
  pluginModules.setupWebAPIs()
})

app.on('window-all-closed', function () {
  // it's normal for OSX apps to stay open, even if all windows are closed
  // but, since we have an uncloseable tabs bar, let's close when they're all gone
  app.quit()
})