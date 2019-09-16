/* globals beaker */

import yo from 'yo-yo'
import * as toast from '../com/toast'
import Logger from '../com/settings/logger'
import DatCache from '../com/settings/dat-cache'
import CrawlerStatus from '../com/settings/crawler-status'
import renderBuiltinPagesNav from '../com/builtin-pages-nav'

// globals
// =

var settings
var users
var browserInfo
var browserEvents
var defaultProtocolSettings
var activeView = 'general'
var logger = new Logger()
var datCache = new DatCache()
var crawlerStatus = new CrawlerStatus()

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
  browserInfo = beaker.browser.getInfo()
  settings = await beaker.browser.getSettings()
  defaultProtocolSettings = await beaker.browser.getDefaultProtocolSettings()
  users = await beaker.users.list()

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
      <div class="builtin-main fullwidth">
        ${renderSidebar()}
        ${renderView()}
      </div>
    </div>`
  )
}

function renderSidebar () {
  return yo`
    <div class="builtin-sidebar">
      ${renderBuiltinPagesNav('beaker://settings/', 'Settings')}

      <div class="nav-item ${activeView === 'general' ? 'active' : ''}" onclick=${() => onUpdateView('general')}>
        <i class="fa fa-angle-right"></i>
        General
      </div>

      <div class="nav-item ${activeView === 'users' ? 'active' : ''}" onclick=${() => onUpdateView('users')}>
        <i class="fa fa-angle-right"></i>
        Users
      </div>

      <div class="nav-item ${activeView === 'dat-network' ? 'active' : ''}" onclick=${() => onUpdateView('dat-network')}>
        <i class="fa fa-angle-right"></i>
        Dat Network
      </div>

      <hr>

      <div class="nav-item ${activeView === 'logger' ? 'active' : ''}" onclick=${() => onUpdateView('logger')}>
        <i class="fa fa-angle-right"></i>
        Log Viewer
      </div>

      <div class="nav-item ${activeView === 'crawler' ? 'active' : ''}" onclick=${() => onUpdateView('crawler')}>
        <i class="fa fa-angle-right"></i>
        Crawler
      </div>

      <div class="nav-item ${activeView === 'dat-cache' ? 'active' : ''}" onclick=${() => onUpdateView('dat-cache')}>
        <i class="fa fa-angle-right"></i>
        Dat Cache
      </div>

      <hr>

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
    case 'users':
      return renderUsers()
    case 'dat-network':
      return renderDatNetwork()
    case 'logger':
      return renderLogger()
    case 'dat-cache':
      return renderDatCache()
    case 'crawler':
      return renderCrawler()
    case 'information':
      return renderInformation()
  }
}

function renderGeneral () {
  return yo`
    <div class="view not-fullwidth">
      ${renderAutoUpdater()}
      ${renderOnStartupSettings()}
      ${renderProtocolSettings()}
      ${renderAnalyticsSettings()}
    </div>
  `
}

function renderUsers () {
  const onEdit = async (e, user) => {
    e.preventDefault()
    e.stopPropagation()

    var opts = await beaker.browser.showModal('user', user)
    Object.assign(user, opts)
    renderToPage()
  }

  const onDelete = async (e, user) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('Are you sure?')) {
      await beaker.users.remove(user.url)
      location.reload()
    }
  }

  return yo`
    <div class="view not-fullwidth">
      <div class="section">
        <h2 class="subtitle-heading">Users</h2>
        ${users.map(user => yo`
          <div class="user">
            <div class="user-thumb"><img src="asset:thumb:${user.url}?cache_buster=${Date.now()}"></div>
            <div class="user-info">
              <div class="user-title">${user.title || 'Anonymous'} <small>${user.label}</small></div>
              <div class="user-description">${user.description || yo`<em>No description</em>`}</div>
              <div class="user-ctrls">
                [
                <a href="${user.url}" target="_blank">View website</a> |
                <a href="#" onclick=${e => onEdit(e, user)}>Edit</a> |
                <a href="#" onclick=${e => onDelete(e, user)}>Delete</a>
                ]
                ${user.isDefault ? 'Default user' : ''}
              </div>
            </div>
          </div>
        `)}
      </div>
    </div>
  `
}

function renderDatNetwork () {
  return yo`
    <div class="view not-fullwidth">
      ${renderDefaultToDatSetting()}
      ${renderDatSettings()}
      ${renderDefaultDatIgnoreSettings()}
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

function renderDatSettings () {
  function onChangeUpload (e) {
    var v = e.currentTarget.value
    settings.dat_bandwidth_limit_up = (v && +v) ? +v : 0
    beaker.browser.setSetting('dat_bandwidth_limit_up', settings.dat_bandwidth_limit_up)
    renderToPage()
    toast.create('Upload limit updated')
  }
  function onChangeDownload (e) {
    var v = e.currentTarget.value
    settings.dat_bandwidth_limit_down = (v && +v) ? +v : 0
    beaker.browser.setSetting('dat_bandwidth_limit_down', settings.dat_bandwidth_limit_down)
    renderToPage()
    toast.create('Download limit updated')
  }

  var up = settings.dat_bandwidth_limit_up || ''
  var down = settings.dat_bandwidth_limit_down || ''

  return yo`
    <div class="section dat-bandwidth">
      <h2 id="dat-bandwidth" class="subtitle-heading">Dat Settings</h2>

      <p>
        Set a limit on your bandwidth usage for Dat.
      </p>

      <div class="inputs">
        <div>
          <label for="dat-upload-limit">Upload limit (MB/s)</label>
          <input id="dat-upload-limit" type="text" placeholder="Unlimited" value=${up} onchange=${onChangeUpload} />
        </div>
        <div>
          <label for="dat-download-limit">Download limit (MB/s)</label>
          <input id="dat-download-limit" type="text" placeholder="Unlimited" value=${down} onchange=${onChangeDownload} />
        </div>
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

      <div class="message">
        <p>Help us know how we${"'"}re doing! Enabling analytics will send us the following information once a week:</p>

        <ul>
          <li>An anonymous ID</li>
          <li>Your Beaker version, e.g. ${browserInfo.version}</li>
          <li>Your operating system, e.g. Windows 10</li>
        </ul>
      </div>
    </div>`
}

function renderLogger () {
  return yo`
    <div class="view">
      <div class="section">
        ${logger.render()}
      </div>
    </div>
  `
}

function renderDatCache () {
  return yo`
    <div class="view">
      <div class="section">
        <h2 id="dat-cache" class="subtitle-heading">Dat cache</h2>
        ${datCache.render()}
      </div>
    </div>
  `
}

function renderCrawler () {
  return yo`
    <div class="view">
      <div class="section">
        <h2 id="crawler" class="subtitle-heading">Crawler</h2>
        ${crawlerStatus.render()}
      </div>
    </div>
  `
}

function renderInformation () {
  return yo`
    <div class="view not-fullwidth">
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
          <li><a href="https://github.com/beakerbrowser/beaker/issues/new">Report an issue</a></li>
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

function renderDefaultToDatSetting () {
  return yo`
    <div class="section default-to-dat">
      <h2 id="protocol" class="subtitle-heading">Default redirect to dat</h2>

      <label class="toggle">
        <input checked=${isAutoRedirectEnabled()} type="checkbox" onchange=${onToggleAutoRedirect} />

        <div class="switch"></div>
        <span class="text">
          Automatically redirect to dat:// when available
        </span>
      </label>
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
          To get the most recent version of Beaker, you'll need to <a href="https://github.com/beakerbrowser/beaker">
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

function onToggleAutoRedirect () {
  settings.auto_redirect_to_dat = isAutoRedirectEnabled() ? 0 : 1
  renderToPage()
  beaker.browser.setSetting('auto_redirect_to_dat', settings.auto_redirect_to_dat)
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

function isAutoRedirectEnabled () {
  return +settings.auto_redirect_to_dat === 1
}
