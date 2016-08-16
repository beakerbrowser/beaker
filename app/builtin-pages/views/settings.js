/*
This uses the beakerBrowser API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'

// globals
// =

var settings = {}
var browserInfo
var plugins
var pluginSearch = {
  isSearching: false,
  didFail: false
}

// exported API
// =

export function setup () {
}

export function show () {
  document.title = 'Settings'
  co(function* () {
    browserInfo = yield beakerBrowser.getInfo()
    plugins = yield beakerBrowser.listPlugins()
    render()
  })
}

export function hide () {
}

// rendering
// =

function render () {
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
  if (browserInfo.isUpdateAvailable) {
    return yo`<div class="s-section">
      <button class="btn">Restart now</button>
      <span class="version-info">
        <span class="icon icon-up-circled"></span>
        <strong>New version available.</strong> Restart Beaker to install.
        <label><input type="checkbox" checked /> Check for updates automatically</label>
      </span>
    </div>`
  }
  else if (browserInfo.isCheckingForUpdates) {
    return yo`<div class="s-section">
      <button class="btn" disabled>Checking for updates...</button>
      <span class="version-info">
        <div class="spinner"></div>
        <strong>Beaker v${browserInfo.version}</strong> is up-to-date
        <label><input type="checkbox" checked /> Check for updates automatically</label>
      </span>
    </div>`
  }
  else {
    return yo`<div class="s-section">
      <button class="btn btn-default" onclick=${onClickCheckUpdates}>Check for updates</button>
      <span class="version-info">
        <span class="icon icon-check"></span>
        <strong>Beaker v${browserInfo.version}</strong> is up-to-date
        <label><input type="checkbox" checked /> Check for updates automatically</label>
      </span>
    </div>`
  }
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
  return Object.keys(plugins).map(name => {
    var p = plugins[name]
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
      <div><label><input type="checkbox" checked /> Enabled</label></div>
    </div>`
  })
}

// event handlers
// =

function onClickCheckUpdates () {
  // TODO - trigger check

  browserInfo.isCheckingForUpdates = true
  render()

  setTimeout(() => {
    browserInfo.isCheckingForUpdates = false
    browserInfo.isUpdateAvailable = true
    render()
  }, 2e3)
}

function onKeyDownSearch (e) {
  // only handle enter
  if (e.keyCode != 13)
    return

  // get the search name
  var name = e.target.value
  if (!name.startsWith('beaker-plugin-'))
    name = 'beaker-plugin-' + name // fix the name

  // only search if not already present
  if (plugins[name])
    return highlight(name)

  // render searching
  pluginSearch.isSearching = true
  pluginSearch.didFail = false
  render()

  // run the search
  co(function*() {
    try {
      // add plugin info to the listing
      var pluginInfo = yield beakerBrowser.lookupPlugin(name)
      pluginInfo = pluginInfo[Object.keys(pluginInfo)[0]]
      plugins[name] = {
        name: pluginInfo.name,
        author: (pluginInfo.author||'').replace(/ <.*>/, ''), // strip out email
        description: pluginInfo.description,
        homepage: pluginInfo.homepage,
        version: pluginInfo.version
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

// internal methods
// =

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