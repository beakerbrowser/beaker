/*
This uses the beakerBrowser API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'

// globals
// =

var settings = {}
var browserInfo

// exported API
// =

export function setup () {
}

export function show () {
  co(function* () {
    document.title = 'Settings'
    console.log('getting info', beakerBrowser)
    browserInfo = yield beakerBrowser.getInfo()

    console.log('got info', browserInfo)
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
      ${render_updates()}
      <div class="ll-heading">Plugins</div>
      <div class="s-section plugins">
        <div class="p-search">
          <span class="icon icon-search"></span>
          <input type="text" placeholder="Search for a plugin">
        </div>
        <div class="p-plugin">
          <div class="p-plugin-title"><strong>IPFS</strong> <label><input type="checkbox" checked /> Enabled</label></div>
          <div class="p-plugin-desc">Browse sites on the IPFS network.</div>
          <div class="p-plugin-link"><a href="https://github.com/pfrazee/beaker-plugin-ipfs">https://github.com/pfrazee/beaker-plugin-ipfs</a></div>
        </div>
        <div class="p-plugin">
          <div class="p-plugin-title"><strong>Dat</strong> <label><input type="checkbox" checked /> Enabled</label></div>
          <div class="p-plugin-desc">Browse sites on the Dat P2P network.</div>
          <div class="p-plugin-link"><a href="https://github.com/pfrazee/beaker-plugin-dat">https://github.com/pfrazee/beaker-plugin-dat</a></div>
        </div>
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

function render_updates () {
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