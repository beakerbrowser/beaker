/*
This uses the beakerBrowser API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import emitStream from 'emit-stream'

const LOG_LIMIT = 1000

// globals
// =

var settings
var browserInfo
var pluginSearch = {
  isSearching: false,
  didFail: false
}
var browserEvents

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

    render()
  })
}

export function hide () {
  browserInfo = null
  settings = null
}

// rendering
// =

function render () {
  // only render if this page is active
  if (!browserInfo)
    return

  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="settings">
      <div class="ll-heading">Auto-updater</div>
      ${renderAutoUpdater()}
      <div class="ll-heading">Plugins</div>
      <div class="s-section plugins">
        ${renderPluginSearch()}
        ${renderPlugins()}
      </div>
      <br>
      <div class="ll-heading">Application Info</div>
      <div class="s-section">
        <div><strong>Version:</strong> ${browserInfo.version}</div>
        <div><strong>User data:</strong> ${browserInfo.paths.userData}</div>
      </div>
    </div>
  </div>`)
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
          Checking for updates to Beaker or plugins...
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

function renderPluginSearch () {
  return yo`<div class="p-search">
    <span class="icon icon-search"></span>
    <input type="text" placeholder="Search for a plugin" onkeydown=${onKeyDownSearch} />
    ${pluginSearch.isSearching ? yo`<div class="spinner"></div>` : ''}
    ${pluginSearch.didFail ? yo`<span class="p-search-error">Plugin not found</span>` : ''}
  </div>`
}

function renderPlugins () {
  return Object.keys(browserInfo.plugins).map(name => {
    var p = browserInfo.plugins[name]

    // install button
    var installBtn
    if (browserInfo.updater.state != 'idle') {
      if (browserInfo.updater.state == 'downloaded')
        installBtn = yo`<span><button class="btn" disabled>Updates installed</button></span>`
      else
        installBtn = yo`<span><button class="btn" disabled>Checking for updates</button></span>`
    } else {
      switch (p.status) {
        case 'installed':
          installBtn = yo`<button class="btn" onclick=${onClickUninstallPlugin(name)}>Uninstall</button>`
          break
        case 'installing':
          installBtn = yo`<span><button class="btn" disabled>Installing</button> <div class="spinner"></div> Please wait. This may take a few minutes...</span>`
          break
        case 'done-installing':
          installBtn = yo`<span><button class="btn" disabled>Installed</button> <a href="#" onclick=${onClickRestart}>Restart Beaker</a> to finish installing.</span>`
          break
        case 'uninstalled':
          installBtn = yo`<button class="btn" onclick=${onClickInstallPlugin(name)}>Install</button>`
          break
        case 'uninstalling':
          installBtn = yo`<span><button class="btn" disabled>Uninstalling</button> <div class="spinner"></div> Please wait. This should be quick!</span>`
          break
        case 'done-uninstalling':
          installBtn = yo`<span><button class="btn" disabled>Uninstalled</button> <a href="#" onclick=${onClickRestart}>Restart Beaker</a> to finish uninstalling.</span>`
          break
        case 'updated':
          installBtn = yo`<span><button class="btn" disabled>Update installed</button> <a href="#" onclick=${onClickRestart}>Restart Beaker</a> to finish installing.</span>`
          break
      }
    }

    // plugin info
    return yo`<div class="p-plugin" id=${name}>
      <div class="p-plugin-title"><strong>${extractPluginName(p.name)}</strong></div>
      ${p.description ? yo`<div class="p-plugin-desc">${p.description}</div>` : ''}
      <div class="p-plugin-details">
        [
        ${p.author ? yo`<span>by ${p.author.name || p.author} |</span>` : ''}
        Version ${p.version||'0.0.0'} |
        <a href="${p.homepage||('https://npm.im/'+name)}" target="_blank">Homepage</a>
        ]
      </div>
      <div class="p-plugin-installer">${installBtn}</div>
    </div>`
  })
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

function onKeyDownSearch (e) {
  // only handle enter
  if (e.keyCode != 13)
    return

  // get the search name
  var name = e.target.value
  if (!name.startsWith('beaker-plugin-'))
    name = 'beaker-plugin-' + name // fix the name

  // render w/o not-found
  pluginSearch.didFail = false
  render()

  // only search if not already present
  if (browserInfo.plugins[name])
    return highlight(name)

  // render searching
  pluginSearch.isSearching = true
  render()

  // run the search
  co(function*() {
    try {
      // add plugin info to the listing
      var pluginInfo = yield beakerBrowser.lookupPlugin(name)
      pluginInfo = pluginInfo[Object.keys(pluginInfo)[0]]
      browserInfo.plugins[name] = {
        name: pluginInfo.name,
        author: (pluginInfo.author||'').replace(/ <.*>/, ''), // strip out email
        description: pluginInfo.description,
        homepage: pluginInfo.homepage,
        version: pluginInfo.version,
        status: 'uninstalled'
      }
    } catch (e) {
      pluginSearch.didFail = true
    }

    // render result
    pluginSearch.isSearching = false
    render()
    highlight(name)
  })
}

function onClickInstallPlugin (name) {
  return co.wrap(function* (e) {
    var p = browserInfo.plugins[name]

    // render new status
    p.status = 'installing'
    render()

    try {
      // install
      yield beakerBrowser.installPlugin(name)

      // render new status
      p.status = 'done-installing'
      render()
    } catch (e) {
      // render error
      p.status = 'uninstalled'
      // TODO
      console.log(e)
    }
  })
}

function onClickUninstallPlugin (name) {
  return co.wrap(function* (e) {
    var p = browserInfo.plugins[name]

    // render new status
    p.status = 'uninstalling'
    render()

    try {
      // install
      yield beakerBrowser.uninstallPlugin(name)

      // render new status
      p.status = 'done-uninstalling'
      render()
    } catch (e) {
      // render error
      p.status = 'installed'
      // TODO
      console.log(e)
    }
  })
}

function onClickRestart () {
  beakerBrowser.restartBrowser()
}

function onUpdaterStateChanged (state) {

console.debug('onUpdaterStateChanged', state)

  if (!browserInfo)
    return
  // render new state
  browserInfo.updater.state = state
  browserInfo.updater.error = false
  render()
}

function onUpdaterError (err) {

console.debug('onUpdaterError', err)

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

function extractPluginName (name) {
  return name.slice('beaker-plugin-'.length)
}

function highlight (id) {
  var el = document.getElementById(id)
  if (el) {
    el.scrollIntoViewIfNeeded()
    el.animate([
      { background: '#ffeeaa' },
      { background: 'white' }
    ], {
      duration: 500
    })
  }  
}