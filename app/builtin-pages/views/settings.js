/*
This uses the beakerBrowser API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import emitStream from 'emit-stream'

const LOG_LIMIT = 1000

// globals
// =

var settings = {}
var browserInfo
var browserUpdateError = false
var plugins
var pluginSearch = {
  isSearching: false,
  didFail: false
}
var isPluginsUpdating = false
var isPluginsUpdated = false
var browserEvents

// exported API
// =

export function setup () {
  // wire up events
  browserEvents = emitStream(beakerBrowser.eventsStream())
  browserEvents.on('browser-updating', onBrowserUpdating)
  browserEvents.on('browser-done-updating', onBrowserDoneUpdating)
  browserEvents.on('browser-updated', onBrowserUpdated)
  browserEvents.on('browser-update-error', onBrowserUpdateError)
  browserEvents.on('plugins-updating', onPluginsUpdating)
  browserEvents.on('plugins-done-updating', onPluginsDoneUpdating)
  browserEvents.on('plugins-updated', onPluginsUpdated)
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
  browserInfo = null
  plugins = null
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
  if (!browserInfo.isBrowserUpdatesSupported) {
    return yo`<div class="s-section">
      <div>Sorry! Beaker auto-updates are only supported on MacOS and Windows.
      You will need to build new versions of Beaker from source.</div>
    </div>`
  }

  if (browserInfo.isBrowserUpdating) {
    return yo`<div class="s-section">
      <button class="btn" disabled>Updating</button>
      <span class="version-info">
        <div class="spinner"></div>
        Downloading the latest version of Beaker...
        <label><input type="checkbox" checked /> Check for updates automatically</label>
      </span>
    </div>`
  } 
  else if (isPluginsUpdating || browserInfo.isBrowserCheckingForUpdates) {
    return yo`<div class="s-section">
      <button class="btn" disabled>Checking for updates</button>
      <span class="version-info">
        <div class="spinner"></div>
        Checking for updates to Beaker or plugins...
        <label><input type="checkbox" checked /> Check for updates automatically</label>
      </span>
    </div>`
  } 
  else if (isPluginsUpdated || browserInfo.isBrowserUpdated) {
    return yo`<div class="s-section">
      <button class="btn">Restart now</button>
      <span class="version-info">
        <span class="icon icon-up-circled"></span>
        <strong>New version available.</strong> Restart Beaker to install.
        <label><input type="checkbox" checked /> Check for updates automatically</label>
      </span>
    </div>`
  }
  else {
    return yo`<div class="s-section">
      <button class="btn btn-default" onclick=${onClickCheckUpdates}>Check for updates</button>
      <span class="version-info">
        ${ browserUpdateError
          ? yo`<span><span class="icon icon-cancel"></span> ${browserUpdateError}</span>`
          : yo`<span>
              <span class="icon icon-check"></span>
              <strong>Beaker v${browserInfo.version}</strong> is up-to-date
            </span>` }
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

    // install button
    var installBtn
    if (isPluginsUpdating) {
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
  if (plugins[name])
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
      plugins[name] = {
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
    var p = plugins[name]

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
      // TODO
      console.log(e)
    }
  })
}

function onClickUninstallPlugin (name) {
  return co.wrap(function* (e) {
    var p = plugins[name]

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
      // TODO
      console.log(e)
    }
  })
}

function onClickRestart () {
  beakerBrowser.restartBrowser()
}

function onBrowserUpdating (isDownloading) {
  browserUpdateError = false
  browserInfo.isBrowserCheckingForUpdates = !isDownloading
  browserInfo.isBrowserUpdating = isDownloading
  render()
}

function onBrowserDoneUpdating () {
  browserInfo.isBrowserCheckingForUpdates = false
  browserInfo.isBrowserUpdating = false
  render()
}

function onBrowserUpdated () {
  // render new state
  browserInfo.isBrowserUpdated = true
  render()
}

function onBrowserUpdateError (err) {
  browserUpdateError = err
  render()
}

function onPluginsUpdating () {
  isPluginsUpdating = true
  render()
}

function onPluginsDoneUpdating () {
  isPluginsUpdating = false
  render()
}

function onPluginsUpdated () {
  // render new state
  isPluginsUpdated = true
  render()

  // refetch plugins to render the update
  co(function* () {
    plugins = yield beakerBrowser.listPlugins()
    render()
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