/* globals beaker confirm */

import yo from 'yo-yo'
import * as toast from '../com/toast'
import {niceDate} from '../../lib/time'
import DatNetworkActivity from '../com/dat-network-activity'
import renderBuiltinPagesNav from '../com/builtin-pages-nav'

// globals
// =

var settings
var browserInfo
var browserEvents
var defaultProtocolSettings
var activeView = 'general'
var datNetworkActivity = new DatNetworkActivity()

// main
// =

setup()
async function setup () {
  renderToPage()

  // wire up events
  browserEvents = beaker.browser.createEventsStream()
  browserEvents.addEventListener('updater-state-changed', onUpdaterStateChanged)
  browserEvents.addEventListener('updater-error', onUpdaterError)
  window.addEventListener('popstate', onPopState)

  // fetch data
  browserInfo = await beaker.browser.getInfo()
  settings = await beaker.browser.getSettings()
  defaultProtocolSettings = await beaker.browser.getDefaultProtocolSettings()
  // applications = await beaker.apps.list(0) TODO(apps) restore when we bring back apps -prf

  // set the view and render
  setViewFromHash()
}

// rendering
// =

function renderToPage () {
  // only render if this page is active
  if (!browserInfo) {
    yo.update(document.querySelector('.settings-wrapper'), yo`
      <div class="settings-wrapper builtin-wrapper" id="el-content">
        <div class="settings-wrapper builtin-wrapper"></div>
      </div>`
    )
    return
  }

  yo.update(document.querySelector('.settings-wrapper'), yo`
    <div id="el-content" class="settings-wrapper builtin-wrapper">
      ${renderHeader()}

      <div class="builtin-main">
        ${renderSidebar()}
        ${renderView()}
      </div>
    </div>`
  )
}

function renderHeader () {
  return yo`
    <div class="builtin-header fixed">
      ${renderBuiltinPagesNav('Settings')}
    </div>`
}

function renderSidebar () {
  return yo`
    <div class="builtin-sidebar">
      <div class="nav-item ${activeView === 'general' ? 'active' : ''}" onclick=${() => onUpdateView('general')}>
        <i class="fa fa-angle-right"></i>
        General
      </div>

      <div class="nav-item ${activeView === 'dat-network-activity' ? 'active' : ''}" onclick=${() => onUpdateView('dat-network-activity')}>
        <i class="fa fa-angle-right"></i>
        Dat network activity
      </div>

      <div class="nav-item ${activeView === 'information' ? 'active' : ''}" onclick=${() => onUpdateView('information')}>
        <i class="fa fa-angle-right"></i>
        Information & Help
      </div>
    </div>`
}

function renderView () {
  switch (activeView) {
    case 'general':
      return renderGeneral()
    case 'dat-network-activity':
      return renderDatNetworkActivity()
    case 'information':
      return renderInformation()
  }
}

function renderGeneral () {
  return yo`
    <div class="view">
      ${renderWorkspacePathSettings()}
      ${renderAutoUpdater()}
      ${renderProtocolSettings()}
    </div>
  `
}

function renderWorkspacePathSettings () {
  return yo`
    <div class="section">
      <h2 id="workspace-path" class="subtitle-heading">Default workspace directory</h2>

      <p>
        Choose the default directory where your projects will be saved.
      </p>

      <p>
        <code>${settings.workspace_default_path}</code>
        <button class="btn small" onclick=${onUpdateDefaultWorkspaceDirectory}>
          Choose directory
        </button>
      </p>
    </div>
  `
}

function renderDatNetworkActivity () {
  return yo`
    <div class="view">
      <div class="section">
        <h2 id="dat-network-activity" class="subtitle-heading">Dat Network Activity</h2>
        ${datNetworkActivity.render()}
      </div>
    </div>
  `
}

function renderInformation () {
  return yo`
    <div class="view">
      <div class="section">
        <h2 id="information" class="subtitle-heading">About Beaker</h2>
        <ul>
          <li>Version: ${browserInfo.version} Electron: ${browserInfo.electronVersion} - Chromium: ${browserInfo.chromiumVersion} - Node: ${browserInfo.nodeVersion}</li>
          <li>User data: ${browserInfo.paths.userData}</li>
        </ul>
      </div>
      <div class="section">
        <h2 class="subtitle-heading">Get help</h2>
        <ul>
          <li><a href="https://beakerbrowser.com/docs/using-beaker">Take a tour of Beaker</a></li>
          <li><a href="https://beakerbrowser.com/docs">Read the documentation</a></li>
          <li><a href="https://github.com/beakerbrowser/beaker/issues">Report an issue</a></li>
        </ul>
      </div>
    </div>
  `
}

function renderProtocolSettings () {
  function register (protocol) {
    return () => {
      // update and optimistically render
      beaker.browser.setAsDefaultProtocolClient(protocol)
      defaultProtocolSettings[protocol] = true
      renderToPage()
    }
  }
  var registered = Object.keys(defaultProtocolSettings).filter(k => defaultProtocolSettings[k])
  var unregistered = Object.keys(defaultProtocolSettings).filter(k => !defaultProtocolSettings[k])

  return yo`
    <div class="section">
      <h2 id="protocol" class="subtitle-heading">Default browser settings</h2>
      ${registered.length
        ? yo`<p>Beaker is the default browser for <strong>${registered.join(', ')}</strong>.</p>`
        : ''}
      ${unregistered.map(proto => yo`
        <p>
          <strong>${proto}</strong>
          <a onclick=${register(proto)}>
            Make default
            <i class="fa fa-share"></i>
          </a>
        </p>`)}
      </div>`
}

function renderAutoUpdater () {
  if (!browserInfo.updater.isBrowserUpdatesSupported) {
    return yo`
      <div class="section">
        <h2 id="auto-updater" class="subtitle-heading">Auto updater</h2>

        <div class="message info">
          Sorry! Beaker auto-updates are only supported on the production build for MacOS and Windows.
        </div>

        <p>
          To get the most recent version of Beaker, you${"'"}ll need to <a href="https://github.com/beakerbrowser/beaker">
          build Beaker from source</a>.
        </p>
      </div>`
  }

  switch (browserInfo.updater.state) {
    default:
    case 'idle':
      return yo`
      <div class="section">
        <h2 id="auto-updater" class="subtitle-heading">Auto updater</h2>

        ${browserInfo.updater.error
          ? yo`<div class="message error"><i class="fa fa-exclamation-triangle"></i> ${browserInfo.updater.error}</div>`
          : ''}

        <div class="auto-updater">
          <button class="btn btn-default" onclick=${onClickCheckUpdates}>Check for updates</button>
          <span>
            <span class="fa fa-check"></span>
            <strong>Beaker v${browserInfo.version}</strong> is up-to-date
          </span>
          ${renderAutoUpdateCheckbox()}
        </div>
        <div class="prereleases">
          [ Advanced: <a href="#" onclick=${onClickCheckPrereleases}>Check for prereleases</a> ]
        </div>
      </div>`

    case 'checking':
      return yo`
      <div class="section">
        <h2 id="auto-updater" class="subtitle-heading">Auto updater</h2>
        
        <div class="auto-updater">
          <button class="btn" disabled>Checking for updates</button>
          <span class="version-info">
            <div class="spinner"></div>
            Checking for updates to Beaker...
          </span>
          ${renderAutoUpdateCheckbox()}
        </div>
      </div>`

    case 'downloading':
      return yo`
      <div class="section">
        <h2 id="auto-updater" class="subtitle-heading">Auto updater</h2>
        
        <div class="auto-updater">
          <button class="btn" disabled>Updating</button>
          <span class="version-info">
            <div class="spinner"></div>
            Downloading the latest version of Beaker...
          </span>
          ${renderAutoUpdateCheckbox()}
        </div>
      </div>`

    case 'downloaded':
      return yo`
      <div class="section">
        <h2 id="auto-updater" class="subtitle-heading">Auto updater</h2>
        
        <div class="auto-updater">
          <button class="btn" onclick=${onClickRestart}>Restart now</button>
          <span class="version-info">
            <i class="fa fa-arrow-circle-o-up"></i>
            <strong>New version available.</strong> Restart Beaker to install.
          </span>
          ${renderAutoUpdateCheckbox()}
        </div>
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

function onUpdateView (view) {
  activeView = view
  window.location.hash = view
  renderToPage()
}

function onClickCheckUpdates () {
  // trigger check
  beaker.browser.checkForUpdates()
}

function onClickCheckPrereleases (e) {
  e.preventDefault()
  beaker.browser.checkForUpdates({prerelease: true})
}

function onToggleAutoUpdate () {
  settings.auto_update_enabled = isAutoUpdateEnabled() ? 0 : 1
  renderToPage()
  beaker.browser.setSetting('auto_update_enabled', settings.auto_update_enabled)
}

async function onUpdateDefaultWorkspaceDirectory () {
  let path = await beaker.browser.showOpenDialog({
    title: 'Select a folder',
    buttonLabel: 'Select folder',
    properties: ['openDirectory']
  })

  if (path) {
    path = path[0]
    settings.workspace_default_path = path
    beaker.browser.setSetting('workspace_default_path', settings.workspace_default_path)
    renderToPage()
    toast.create('Workspace directory updated')
  }
}

function onClickRestart () {
  beaker.browser.restartBrowser()
}

function onUpdaterStateChanged (state) {
  if (!browserInfo) { return }
  // render new state
  browserInfo.updater.state = state
  browserInfo.updater.error = false
  renderToPage()
}

function onUpdaterError (err) {
  if (!browserInfo) { return }
  // render new state
  browserInfo.updater.error = err
  renderToPage()
}

function onPopState (e) {
  setViewFromHash()
}

// internal methods
// =

function setViewFromHash () {
  let hash = window.location.hash
  onUpdateView((hash && hash !== '#') ? hash.slice(1) : 'general')
}

function isAutoUpdateEnabled () {
  return +settings.auto_update_enabled === 1
}
