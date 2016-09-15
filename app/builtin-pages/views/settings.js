/*
This uses the beakerBrowser API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import emitStream from 'emit-stream'

// globals
// =

var settings
var browserInfo
var browserEvents
var defaultProtocolSettings

// exported API
// =

export function setup () {
  // wire up events
  browserEvents = emitStream(beakerBrowser.eventsStream())
  browserEvents.on('updater-state-changed', onUpdaterStateChanged)
  browserEvents.on('updater-error', onUpdaterError)
}

export function show () {
  document.title = 'Settings'
  co(function* () {
    browserInfo = yield beakerBrowser.getInfo()
    settings = yield beakerBrowser.getSettings()
    defaultProtocolSettings = yield beakerBrowser.getDefaultProtocolSettings()

    render()
  })
}

export function hide () {
  browserInfo = null
  settings = null
  defaultProtocolSettings = null
}

// rendering
// =

function render () {
  // only render if this page is active
  if (!browserInfo)
    return

  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="settings">
      <div class="ll-heading">
        Auto-updater
        <small class="ll-heading-right">
          <a href="https://beakerbrowser.com/docs/" title="Get Help"><span class="icon icon-lifebuoy"></span> Help</a>
        </small>
      </div>
      ${renderAutoUpdater()}
      <div class="ll-heading">Default Browser</div>
      ${renderProtocolSettings()}
      <div class="ll-heading">Application Info</div>
      <div class="s-section">
        <div><strong>Version:</strong> ${browserInfo.version}</div>
        <div><strong>User data:</strong> ${browserInfo.paths.userData}</div>
      </div>
    </div>
  </div>`)
}

function renderProtocolSettings () {
  function register (protocol) {
    return () => {
      // update and optimistically render
      beakerBrowser.setAsDefaultProtocolClient(protocol)
      defaultProtocolSettings[protocol] = true
      render()
    }
  }
  var registered   = Object.keys(defaultProtocolSettings).filter(k => defaultProtocolSettings[k])
  var unregistered = Object.keys(defaultProtocolSettings).filter(k => !defaultProtocolSettings[k])

  return yo`<div class="s-section">
    ${registered.length
      ? yo`<div>Beaker is the default browser for <strong>${registered.join(', ')}</strong>.</div>`
      : '' }
    ${unregistered.map(proto => yo`<div>Make Beaker the default browser for <strong>${proto}</strong>? <a class="icon icon-check" onclick=${register(proto)}> Yes</a>.</div>`)}
  </div>`
}

function renderAutoUpdater () {
  if (!browserInfo.updater.isBrowserUpdatesSupported) {
    return yo`<div class="s-section">
      <div>Sorry! Beaker auto-updates are only supported on the production build for MacOS and Windows.
      You will need to build new versions of Beaker from source.</div>
    </div>`
  }

  switch (browserInfo.updater.state) {
    default:
    case 'idle':
      return yo`<div class="s-section">
        <button class="btn btn-default" onclick=${onClickCheckUpdates}>Check for updates</button>
        <span class="version-info">
          ${ browserInfo.updater.error
            ? yo`<span><span class="icon icon-cancel"></span> ${browserInfo.updater.error}</span>`
            : yo`<span>
                <span class="icon icon-check"></span>
                <strong>Beaker v${browserInfo.version}</strong> is up-to-date
              </span>` }
          ${renderAutoUpdateCheckbox()}
        </span>
      </div>`

    case 'checking':
      return yo`<div class="s-section">
        <button class="btn" disabled>Checking for updates</button>
        <span class="version-info">
          <div class="spinner"></div>
          Checking for updates to Beaker...
          ${renderAutoUpdateCheckbox()}
        </span>
      </div>`

    case 'downloading':
      return yo`<div class="s-section">
        <button class="btn" disabled>Updating</button>
        <span class="version-info">
          <div class="spinner"></div>
          Downloading the latest version of Beaker...
          ${renderAutoUpdateCheckbox()}
        </span>
      </div>`

    case 'downloaded':
      return yo`<div class="s-section">
        <button class="btn" onclick=${onClickRestart}>Restart now</button>
        <span class="version-info">
          <span class="icon icon-up-circled"></span>
          <strong>New version available.</strong> Restart Beaker to install.
          ${renderAutoUpdateCheckbox()}
        </span>
      </div>`
  }
}

function renderAutoUpdateCheckbox () {
  return yo`<label>
    <input type="checkbox" checked=${isAutoUpdateEnabled()} onclick=${onToggleAutoUpdate} /> Check for updates automatically
  </label>`
}

// event handlers
// =

function onClickCheckUpdates () {
  // trigger check
  beakerBrowser.checkForUpdates()
}

function onToggleAutoUpdate () {
  settings.auto_update_enabled = isAutoUpdateEnabled() ? 0 : 1
  render()
  beakerBrowser.setSetting('auto_update_enabled', settings.auto_update_enabled)
}

function onClickRestart () {
  beakerBrowser.restartBrowser()
}

function onUpdaterStateChanged (state) {
  if (!browserInfo)
    return
  // render new state
  browserInfo.updater.state = state
  browserInfo.updater.error = false
  render()
}

function onUpdaterError (err) {
  if (!browserInfo)
    return
  // render new state
  browserInfo.updater.error = err
  render()
}

// internal methods
// =

function isAutoUpdateEnabled () {
  return +settings.auto_update_enabled === 1
}
