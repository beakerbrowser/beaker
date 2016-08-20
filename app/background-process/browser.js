import { app, protocol, autoUpdater } from 'electron'
import os from 'os'
import rpc from 'pauls-electron-rpc'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import path from 'path'
import fs from 'fs'
import log from 'loglevel'
import globalModulesDir from 'global-modules'
import co from 'co'
import manifest from './api-manifests/browser'
import { cbPromise } from '../lib/functions'
import * as settingsDb from './dbs/settings'
import * as plugins from './plugins'

// constants
// =

const IS_BROWSER_UPDATES_SUPPORTED = (os.platform() == 'darwin' || os.platform() == 'win32')

// how long between scheduled auto updates?
const SCHEDULED_AUTO_UPDATE_DELAY = 24 * 60 * 60 * 1e3 // once a day

// globals
// =

// is the auto-updater checking for updates, right now?
var isBrowserCheckingForUpdates = false

// is the auto-updater downloading a new version?
var isBrowserUpdating = false

// does the auto-updater have an update downloaded, and ready to install?
var isBrowserUpdated = false

// used for rpc
var browserEvents = new EventEmitter()

// exported methods
// =

export function setup () {
  // setup auto-updater
  try {
    if (!IS_BROWSER_UPDATES_SUPPORTED)
      throw new Error('Disabled. Only available on macOS and Windows.')
    autoUpdater.setFeedURL(getAutoUpdaterFeedURL())
    autoUpdater.on('checking-for-update', onCheckingForUpdate)
    autoUpdater.on('update-available', onUpdateAvailable)
    autoUpdater.on('update-not-available', onUpdateNotAvailable)
    autoUpdater.on('update-downloaded', onUpdateDownloaded)
    autoUpdater.on('error', onUpdateError)
  } catch (e) {
    log.error('[AUTO-UPDATE]', e.toString())    
  }
  setTimeout(scheduledAutoUpdate, 15e3) // wait 15s for first run

  // wire up RPC
  rpc.exportAPI('beakerBrowser', manifest, { 
    eventsStream,
    getInfo,
    checkForUpdates,
    restartBrowser,

    getSetting,
    getSettings,
    setSetting,

    listPlugins: plugins.list,
    lookupPlugin: plugins.lookup,
    installPlugin: plugins.install,
    uninstallPlugin: plugins.uninstall,

    getProtocolDescription,
    getHomePages
  })
}

export function getInfo () {
  return Promise.resolve({
    version: app.getVersion(),
    platform: os.platform(),

    isBrowserUpdatesSupported: IS_BROWSER_UPDATES_SUPPORTED,
    isBrowserCheckingForUpdates,
    isBrowserUpdating,
    isBrowserUpdated,

    paths: {
      userData: app.getPath('userData')
    }
  })
}

export function checkForUpdates () {
  // check the browser auto-updater
  autoUpdater.checkForUpdates()

  co(function*() {
    try {
      // emit start event
      browserEvents.emit('plugins-updating')

      // run plugin updater
      var results = yield plugins.checkForUpdates()

      // emit updated event
      if (results && results.length > 0)
        browserEvents.emit('plugins-updated')
    } catch (e) {
      log.error('Error updating plugins via npm', e)
    }

    // emit finish event
    browserEvents.emit('plugins-done-updating')
  })

  // just return a resolve; results will be emitted
  return Promise.resolve()
}

export function restartBrowser () {
  if (isBrowserUpdated) {
    // run the update installer
    autoUpdater.quitAndInstall()
    log.debug('[AUTO-UPDATE] Quitting and installing.')
  } else {
    log.debug('Restarting Beaker by restartBrowser()')
    // do a simple restart
    app.relaunch()
    setTimeout(() => app.exit(0), 1e3)
  }
}

export function getSetting (key) {
  return cbPromise(cb => settingsDb.get(key, cb))
}

export function getSettings () {
  return cbPromise(settingsDb.getAll)
}

export function setSetting (key, value) {
  return cbPromise(cb => settingsDb.set(key, value, cb))
}

// get the home-page listing
export function getHomePages () {
  return Promise.resolve(plugins.getAllInfo('homePages'))
}

// get the description for a given scheme
export function getProtocolDescription (scheme) {
  // massage input
  scheme = scheme.replace(/:/g, '')

  // find desc
  return plugins.getAllInfo('protocols').find(proto => proto.scheme == scheme)
}

// rpc methods
// =

function eventsStream () {
  return emitStream(browserEvents)
}

// internal methods
// =

function getAutoUpdaterFeedURL () {
  if (os.platform() == 'darwin') {
    return 'https://download.beakerbrowser.net/update/osx/'+app.getVersion()
  }
  else if (os.platform() == 'win32') {
    let bits = (os.arch().indexOf('64') === -1) ? 32 : 64
    return 'https://download.beakerbrowser.net/update/win'+bits+'/'+app.getVersion()
  }
}

// run a daily check for new updates
function scheduledAutoUpdate () {
  settingsDb.get('auto_update_enabled', (err, v) => {
    // if auto updates are enabled, run the check
    if (+v === 1)
      checkForUpdates()

    // schedule next check
    setTimeout(scheduledAutoUpdate, SCHEDULED_AUTO_UPDATE_DELAY)
  })
}

// event handlers
// =

function onCheckingForUpdate () {
  log.debug('[AUTO-UPDATE] Checking for a new version.')
  isBrowserCheckingForUpdates = true
  browserEvents.emit('browser-updating', false)
}

function onUpdateAvailable () {
  log.debug('[AUTO-UPDATE] New version available. Downloading...')
  isBrowserCheckingForUpdates = false
  isBrowserUpdating = true
  browserEvents.emit('browser-updating', true)
}

function onUpdateNotAvailable () {
  log.debug('[AUTO-UPDATE] No new version found.')
  isBrowserCheckingForUpdates = false
  isBrowserUpdating = false
  browserEvents.emit('browser-done-updating')
}

function onUpdateDownloaded () {
  log.debug('[AUTO-UPDATE] New version downloaded. Ready to install.')
  isBrowserCheckingForUpdates = false
  isBrowserUpdating = false
  isBrowserUpdated = true
  browserEvents.emit('browser-updated')
}

function onUpdateError (e) {
  log.error('[AUTO-UPDATE]', e.toString())
  isBrowserCheckingForUpdates = false
  isBrowserUpdating = false
  isBrowserUpdated = false
  browserEvents.emit('browser-update-error', e.toString())
  browserEvents.emit('browser-done-updating')
}