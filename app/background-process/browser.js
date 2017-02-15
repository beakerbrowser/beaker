import { app, dialog, autoUpdater } from 'electron'
import os from 'os'
import rpc from 'pauls-electron-rpc'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
var debug = require('debug')('beaker')
import manifest from './api-manifests/internal/browser'
import * as settingsDb from './dbs/settings'
import { internalOnly } from '../lib/bg/rpc'
import { isDaemonActive as isIPFSDaemonActive } from './networks/ipfs/ipfs'
import { open as openUrl } from './open-url'

// constants
// =

// how long between scheduled auto updates?
const SCHEDULED_AUTO_UPDATE_DELAY = 24 * 60 * 60 * 1e3 // once a day

// possible updater states
const UPDATER_STATUS_IDLE = 'idle'
const UPDATER_STATUS_CHECKING = 'checking'
const UPDATER_STATUS_DOWNLOADING = 'downloading'
const UPDATER_STATUS_DOWNLOADED = 'downloaded'

// globals
// =

// what's the updater doing?
var updaterState = UPDATER_STATUS_IDLE
var updaterError = false // has there been an error?

// is the updater available? must be on certain platform, and may be disabled if there's an error
var isBrowserUpdatesSupported = (os.platform() == 'darwin' || os.platform() == 'win32')

// events emitted to rpc clients
var browserEvents = new EventEmitter()

// exported methods
// =

export function setup () {
  // setup auto-updater
  try {
    if (!isBrowserUpdatesSupported)
      throw new Error('Disabled. Only available on macOS and Windows.')
    autoUpdater.setFeedURL(getAutoUpdaterFeedURL())
    autoUpdater.once('update-available', onUpdateAvailable)
    autoUpdater.on('error', onUpdateError)
  } catch (e) {
    debug('[AUTO-UPDATE] error', e.toString())
    isBrowserUpdatesSupported = false
  }
  setTimeout(scheduledAutoUpdate, 15e3) // wait 15s for first run

  // wire up RPC
  rpc.exportAPI('beakerBrowser', manifest, {
    eventsStream,
    getInfo,
    checkForUpdates,
    restartBrowser,

    isIPFSDaemonActive,

    getSetting,
    getSettings,
    setSetting,

    getDefaultProtocolSettings,
    setAsDefaultProtocolClient,
    removeAsDefaultProtocolClient,

    showOpenDialog,
    openUrl
  }, internalOnly)
}

export function getDefaultProtocolSettings () {
  return Promise.resolve(['http', 'dat', 'fs'].reduce((res, x) => {
    res[x] = app.isDefaultProtocolClient(x)
    return res
  }, {}))
}

export function setAsDefaultProtocolClient (protocol) {
  return Promise.resolve(app.setAsDefaultProtocolClient(protocol))
}

export function removeAsDefaultProtocolClient (protocol) {
  return Promise.resolve(app.removeAsDefaultProtocolClient(protocol))
}

export function getInfo () {
  return Promise.resolve({
    version: app.getVersion(),
    platform: os.platform(),
    updater: {
      isBrowserUpdatesSupported,
      error: updaterError,
      state: updaterState
    },
    paths: {
      userData: app.getPath('userData')
    }
  })
}

// this method was written, as it is, when there was an in-app plugins installer
// since it works well enough, and the in-app installer may return, Im leaving it this way
// ... but, that would explain the somewhat odd design
// -prf
export function checkForUpdates () {
  // dont overlap
  if (updaterState != UPDATER_STATUS_IDLE)
    return

  // track result states for this run
  var isBrowserChecking = false // still checking?
  var isBrowserUpdated = false  // got an update?

  // update global state
  debug('[AUTO-UPDATE] Checking for a new version.')
  updaterError = false
  setUpdaterState(UPDATER_STATUS_CHECKING)

  if (isBrowserUpdatesSupported) {
    // check the browser auto-updater
    // - because we need to merge the electron auto-updater, and the npm plugin flow...
    //   ... it's best to set the result events here
    //   (see note above -- back when there WAS a plugin updater, this made since -prf)
    isBrowserChecking = true
    autoUpdater.checkForUpdates()
    autoUpdater.once('update-not-available', () => {
      debug('[AUTO-UPDATE] No browser update available.')
      isBrowserChecking = false
      checkDone()
    })
    autoUpdater.once('update-downloaded', () => {
      debug('[AUTO-UPDATE] New browser version downloaded. Ready to install.')
      isBrowserChecking = false
      isBrowserUpdated = true
      checkDone()
    })

    // cleanup
    autoUpdater.once('update-not-available', removeAutoUpdaterListeners)
    autoUpdater.once('update-downloaded', removeAutoUpdaterListeners)
    function removeAutoUpdaterListeners () {
      autoUpdater.removeAllListeners('update-not-available')
      autoUpdater.removeAllListeners('update-downloaded')
    }
  }

  // check the result states and emit accordingly
  function checkDone () {
    if (isBrowserChecking)
      return // still checking

    // done, emit based on result
    if (isBrowserUpdated) {
      setUpdaterState(UPDATER_STATUS_DOWNLOADED)
    } else {
      setUpdaterState(UPDATER_STATUS_IDLE)
    }
  }

  // just return a resolve; results will be emitted
  return Promise.resolve()
}

export function restartBrowser () {
  if (updaterState == UPDATER_STATUS_DOWNLOADED) {
    // run the update installer
    autoUpdater.quitAndInstall()
    debug('[AUTO-UPDATE] Quitting and installing.')
  } else {
    debug('Restarting Beaker by restartBrowser()')
    // do a simple restart
    app.relaunch()
    setTimeout(() => app.exit(0), 1e3)
  }
}

export function getSetting (key) {
  return settingsDb.get(key)
}

export function getSettings () {
  return settingsDb.getAll()
}

export function setSetting (key, value) {
  return settingsDb.set(key, value)
}

// rpc methods
// =

function eventsStream () {
  return emitStream(browserEvents)
}

function showOpenDialog (opts = {}) {
  return new Promise((resolve) => {
    dialog.showOpenDialog({
      title: opts.title,
      buttonLabel: opts.buttonLabel,
      filters: opts.filters,
      properties: opts.properties
    }, filenames => resolve(filenames))
  })
}

// internal methods
// =

function setUpdaterState (state) {
  updaterState = state
  browserEvents.emit('updater-state-changed', state)
}

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
  settingsDb.get('auto_update_enabled').then(v => {
    // if auto updates are enabled, run the check
    if (+v === 1)
      checkForUpdates()

    // schedule next check
    setTimeout(scheduledAutoUpdate, SCHEDULED_AUTO_UPDATE_DELAY)
  })
}

// event handlers
// =

function onUpdateAvailable () {
  // update status and emit, so the frontend can update
  debug('[AUTO-UPDATE] New version available. Downloading...')
  setUpdaterState(UPDATER_STATUS_DOWNLOADING)
}

function onUpdateError (e) {
  debug('[AUTO-UPDATE] error', e.toString())
  setUpdaterState(UPDATER_STATUS_IDLE)
  updaterError = e.toString()
  browserEvents.emit('updater-error', e.toString())
}
