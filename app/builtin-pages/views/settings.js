/* globals beaker */

import yo from 'yo-yo'
import * as toast from '../com/toast'
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
      ${renderAutoUpdater()}
      ${renderDefaultSyncPathSettings()}
      ${renderProtocolSettings()}
      ${renderOnStartupSettings()}
      ${renderDefaultDatIgnoreSettings()}
      ${renderAnalyticsSettings()}
    </div>
  `
}

function renderDefaultSyncPathSettings () {
  return yo`
    <div class="section">
      <h2 class="subtitle-heading">Default working directory</h2>

      <p>
        Choose the default directory where your projects will be saved.
      </p>

      <p>
        <code>${settings.workspace_default_path}</code>
        <button class="btn" onclick=${onUpdateWorkspaceDefaultPath}>
          Choose directory
        </button>
      </p>
    </div>
  `
}

function renderOnStartupSettings () {
  return yo`
    <div class="section on-startup">
      <h2 id="on-startup" class="subtitle-heading">Startup settings</h2>

      <p>
        When Beaker starts
      </p>

      <div class="radio-group">
        <input type="radio" id="customStartPage1" name="custom-start-page"
               value="blank"
               checked=${settings.custom_start_page === 'blank'}
               onchange=${onCustomStartPageChange} />
        <label for="customStartPage1">
          Show a new tab
        </label>

        <input type="radio" id="customStartPage2" name="custom-start-page"
               value="previous"
               checked=${settings.custom_start_page === 'previous'}
               onchange=${onCustomStartPageChange} />
        <label for="customStartPage2">
          Show tabs from your last session
        </label>
      </div>
    </div>
  `
}

function renderDefaultDatIgnoreSettings () {
  return yo`
    <div class="section default-dat-ignore">
      <h2 id="default-dat-ignore" class="subtitle-heading">Default .datignore</h2>

      <p>
        Specify which files should be excluded from your published sites.
      </p>

      <textarea onchange=${onChangeDefaultDatIgnore}>${settings.default_dat_ignore}</textarea>
    </div>
  `
}

function renderAnalyticsSettings () {
  function toggle () {
    // update and optimistically render
    settings.analytics_enabled = (settings.analytics_enabled == 1) ? 0 : 1
    beaker.browser.setSetting('analytics_enabled', settings.analytics_enabled)
    renderToPage()
  }

  return yo`
    <div class="section analytics">
      <h2 class="subtitle-heading">Beaker Analytics</h2>

      <label class="toggle">
        <input checked=${settings.analytics_enabled == 1 ? 'true' : 'false'} type="checkbox" onchange=${toggle} />

        <div class="switch"></div>
        <span class="text">
          Enable analytics
        </span>
      </label>

      <div class="message primary">
        <p>Help us know how we${"'"}re doing! Enabling analytics will send us the following information once a week:</p>

        <ul>
          <li>An anonymous ID</li>
          <li>Your Beaker version, e.g. ${browserInfo.version}</li>
          <li>Your operating system, e.g. Windows 10</li>
        </ul>
      </div>
    </div>`
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
          <li><a href="https://github.com/beakerbrowser/beaker/issues/new?labels=0.8-beta-feedback&template=ISSUE_TEMPLATE_0.8_BETA.md">Report an issue</a></li>
        </ul>
      </div>
    </div>
  `
}

function renderProtocolSettings () {
  function toggleRegistered (protocol) {
    // update and optimistically render
    defaultProtocolSettings[protocol] = !defaultProtocolSettings[protocol]

    if (defaultProtocolSettings[protocol]) {
      beaker.browser.setAsDefaultProtocolClient(protocol)
    } else {
      beaker.browser.removeAsDefaultProtocolClient(protocol)
    }
    renderToPage()
  }

  return yo`
    <div class="section default-browser">
      <h2 id="protocol" class="subtitle-heading">Default browser settings</h2>

      <p>
        Set Beaker as the default browser for:
      </p>

      ${Object.keys(defaultProtocolSettings).map(proto => yo`
        <label class="toggle">
          <input checked=${defaultProtocolSettings[proto] ? 'true' : 'false'} type="checkbox" onchange=${() => toggleRegistered(proto)} />

          <div class="switch"></div>
          <span class="text">
            ${proto}://
          </span>
        </label>`
      )}
    </div>`
}

function renderAutoUpdater () {
  if (!browserInfo.updater.isBrowserUpdatesSupported) {
    return yo`
      <div class="section">
        <h2 id="auto-updater" class="subtitle-heading">Auto updater</h2>

        <div class="message info">
          Sorry! Beaker auto-updates are only supported on the production build for macOS and Windows.
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
        <h2 id="auto-updater" class="subtitle-heading">
          Auto updater
        </h2>

        ${browserInfo.updater.error
          ? yo`
            <div class="message error">
              <i class="fa fa-exclamation-triangle"></i>
              ${browserInfo.updater.error}
            </div>`
          : ''
        }

        <div class="auto-updater">
          <p>
            <button class="btn btn-default" onclick=${onClickCheckUpdates}>Check for updates</button>

            <span class="up-to-date">
              <span class="fa fa-check"></span>
              Beaker v${browserInfo.version} is up-to-date
            </span>
          </p>

          <p>
            ${renderAutoUpdateCheckbox()}
          </p>

          <div class="prereleases">
            <h3>Advanced</h3>
            <button class="btn" onclick=${onClickCheckPrereleases}>
              Check for beta releases
            </button>
          </div>
        </div>
      </div>`

    case 'checking':
      return yo`
      <div class="section">
        <h2 id="auto-updater" class="subtitle-heading">
          Auto updater
        </h2>

        <div class="auto-updater">
          <p>
            <button class="btn" disabled>Checking for updates</button>
            <span class="version-info">
              <div class="spinner"></div>
              Checking for updates...
            </span>
          </p>

          <p>
            ${renderAutoUpdateCheckbox()}
          </p>

          <div class="prereleases">
            <h3>Advanced</h3>
            <button class="btn" onclick=${onClickCheckPrereleases}>
              Check for beta releases
            </button>
          </div>
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
  let hash = window.location.hash
  if (hash.length > 1 && !hash.endsWith(view)) {
    window.history.pushState('', {}, '#' + view)
  } else {
    window.history.replaceState('', {}, '#' + view)
  }
  renderToPage()
}

function onCustomStartPageChange (e) {
  settings.custom_start_page = e.target.value
  beaker.browser.setSetting('custom_start_page', settings.custom_start_page)
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

async function onUpdateWorkspaceDefaultPath () {
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
    toast.create('Default working directory updated')
  }
}

async function onChangeDefaultDatIgnore (e) {
  try {
    await beaker.browser.setSetting('default_dat_ignore', e.target.value)
    toast.create('Default .datignore updated')
  } catch (e) {
    console.error(e)
  }
}

function onClickRestart () {
  beaker.browser.restartBrowser()
}

function onUpdaterStateChanged (e) {
  console.debug('onUpdaterStateChanged', e)
  if (!browserInfo) { return }
  // render new state
  browserInfo.updater.state = e.state
  browserInfo.updater.error = false
  renderToPage()
}

function onUpdaterError (err) {
  console.debug('onUpdaterError', err)
  if (!browserInfo) { return }
  // render new state
  browserInfo.updater.error = err.message
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
