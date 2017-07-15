/* globals beakerBrowser Image */

import ColorThief from '../../lib/fg/color-thief'

const yo = require('yo-yo')
const co = require('co')
const emitStream = require('emit-stream')
const colorThief = new ColorThief()

// globals
// =

var settings
var browserInfo
var browserEvents
var defaultProtocolSettings

// main
// =

co(function * () {
  // wire up events
  browserEvents = emitStream(beakerBrowser.eventsStream())
  browserEvents.on('updater-state-changed', onUpdaterStateChanged)
  browserEvents.on('updater-error', onUpdaterError)

  // fetch data
  browserInfo = yield beakerBrowser.getInfo()
  settings = yield beakerBrowser.getSettings()
  defaultProtocolSettings = yield beakerBrowser.getDefaultProtocolSettings()

  // render
  render()
})

// rendering
// =

function render () {
  // only render if this page is active
  if (!browserInfo) { return }

  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="settings">
      <h1>Settings</h1>
      <h2 class="ll-heading">Auto-updater</h2>
      ${renderAutoUpdater()}

      <h2 class="ll-heading">Protocol settings</h2>
      ${renderProtocolSettings()}

      <h2 class="ll-heading">Start page settings</h2>
      ${renderStartPageSettings()}

      <h2 class="ll-heading">Beaker information</h2>
      <ul class="settings-section">
        <li>Version: ${browserInfo.version}</li>
        <li>User data: ${browserInfo.paths.userData}</li>
      </ul>

      <h2 class="ll-heading">Help</h2>
      ${renderHelp()}
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
  var registered = Object.keys(defaultProtocolSettings).filter(k => defaultProtocolSettings[k])
  var unregistered = Object.keys(defaultProtocolSettings).filter(k => !defaultProtocolSettings[k])

  return yo`<div class="settings-section protocols">
      ${registered.length
    ? yo`<div>Beaker is the default browser for <strong>${registered.join(', ')}</strong>.</div>`
    : ''}
      ${unregistered.map(proto => yo`
        <div>
          <strong>${proto}</strong>
          <a onclick=${register(proto)}>
            Make default
            <i class="fa fa-share"></i>
          </a>
        </div>`)}
      </div>`
}

function renderAutoUpdater () {
  if (!browserInfo.updater.isBrowserUpdatesSupported) {
    return yo`<div class="settings-section">
      <div>Sorry! Beaker auto-updates are only supported on the production build for MacOS and Windows.
      You will need to build new versions of Beaker from source.</div>
    </div>`
  }

  switch (browserInfo.updater.state) {
    default:
    case 'idle':
      return yo`<div class="settings-section">
        <button class="btn btn-default" onclick=${onClickCheckUpdates}>Check for updates</button>
        <span class="version-info">
          ${browserInfo.updater.error
    ? yo`<span><span class="icon icon-cancel"></span> ${browserInfo.updater.error}</span>`
    : yo`<span>
                <span class="icon icon-check"></span>
                <strong>Beaker v${browserInfo.version}</strong> is up-to-date
              </span>`}
          ${renderAutoUpdateCheckbox()}
        </span>
      </div>`

    case 'checking':
      return yo`<div class="settings-section">
        <button class="btn" disabled>Checking for updates</button>
        <span class="version-info">
          <div class="spinner"></div>
          Checking for updates to Beaker...
          ${renderAutoUpdateCheckbox()}
        </span>
      </div>`

    case 'downloading':
      return yo`<div class="settings-section">
        <button class="btn" disabled>Updating</button>
        <span class="version-info">
          <div class="spinner"></div>
          Downloading the latest version of Beaker...
          ${renderAutoUpdateCheckbox()}
        </span>
      </div>`

    case 'downloaded':
      return yo`<div class="settings-section">
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

function renderStartPageSettings () {
  return yo`
  <div class="settings-section start-page">
    <label for="start-background-image">
      Upload a background image for beaker://start
      <input onchange=${onUpdateStartPageBackgroundImage} name="start-background-image" type="file" accept="image/*"/>
    </label>
    ${settings.start_page_background_image
    ? yo`
        <div>
          <button class="btn transparent" onclick=${onUpdateStartPageBackgroundImage}>
            <i class="fa fa-close"></i>
            Remove
          </button>
          <img class="bg-preview" src=${'beaker://start/background-image?cache-buster=' + Date.now()} />
          <label for="start-page-theme">
            Start page theme
            <input type="radio" value="light" onclick=${onUpdateStartPageTheme} checked=${settings.start_page_background_image === 'light'}/>Light
            <input type="radio" value="dark" onclick=${onUpdateStartPageTheme} checked=${settings.start_page_background_image === 'dark'}/>Dark
          </label>
        </div>
                `
    : ''
}
    </div>
  `
}

function renderHelp () {
  return yo`
    <ul class="settings-section help">
      <li><a href="https://beakerbrowser.com/docs/using-beaker">Take a tour of Beaker</a></li>
      <li><a href="https://beakerbrowser.com/docs">Read the documentation</a></li>
      <li><a href="https://github.com/beakerbrowser/beaker/issues">Report an issue</a></li>
    </ul>
  `
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
  if (!browserInfo) { return }
  // render new state
  browserInfo.updater.state = state
  browserInfo.updater.error = false
  render()
}

function onUpdateStartPageTheme (e) {
  var theme = e.target.value
  settings.start_page_background_image = theme
  beakerBrowser.setSetting('start_page_background_image', theme)
  render()
}

async function onUpdateStartPageBackgroundImage () {
  var srcPath = ''
  if (this.files) srcPath = this.files[0].path

  // write the image to start_background_image
  await beakerBrowser.setStartPageBackgroundImage(srcPath)

  // is the image light or dark?
  if (this.files) await setStartPageTheme()
  else {
    settings.start_page_background_image = ''
    await beakerBrowser.setSetting('start_page_background_image', '')
  }
  render()
}

function onUpdaterError (err) {
  if (!browserInfo) { return }
  // render new state
  browserInfo.updater.error = err
  render()
}

// internal methods
// =

function isAutoUpdateEnabled () {
  return +settings.auto_update_enabled === 1
}

function setStartPageTheme () {
  function getBrightness (r, g, b) {
    return Math.sqrt(
      0.241 * Math.pow(r, 2) +
      0.691 * Math.pow(g, 2) +
      0.068 * Math.pow(b, 2))
  }

  return new Promise(resolve => {
    var img = new Image()
    img.setAttribute('crossOrigin', 'anonymous')
    img.onload = e => {
      var palette = colorThief.getPalette(img, 10)
      var totalBrightness = 0

      palette.forEach(color => {
        totalBrightness += getBrightness(...color)
      })

      var brightness = totalBrightness / palette.length

      var theme = brightness < 150 ? 'dark' : 'light'
      beakerBrowser.setSetting('start_page_background_image', theme)
      settings.start_page_background_image = theme
      resolve()
    }
    img.onerror = resolve
    img.src = 'beaker://start/background-image'
  })
}
