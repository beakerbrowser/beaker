/*
This uses the beakerSettings APIs, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'

// globals
// =

var settings = {}
var updateInfo = {
  currentVersion: '0.1.0',
  isCheckingForUpdates: false,
  isUpdateAvailable: false
}

// exported API
// =

export function setup () {
}

export function show () {
  document.title = 'New tab'
  // get the settings
  // beakerBookmarks.list((err, bs) => { TODO
    // bookmarks = bs || []
    render()
  // })
}

export function hide () {
}

// rendering
// =

function render () {
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="settings">
      <fieldset data-title="Auto-updater">
        ${render_updates()}
        <div><label><input type="checkbox"> Check for updates automatically</label></div>
      </fieldset>
    </div>
  </div>`)
}

function render_updates () {
  if (updateInfo.isUpdateAvailable) {
    return yo`<p>
      <button class="btn">Restart now</button>
      <span class="s-version-info">
        <span class="icon icon-up-circled"></span>
        <strong>New version available.</strong> Restart Beaker to install.
      </span>
    </p>`
  }
  else if (updateInfo.isCheckingForUpdates) {
    return yo`<p>
      <button class="btn" disabled>Checking for updates...</button>
      <span class="s-version-info">
        <div class="spinner"></div>
        <strong>Beaker v${updateInfo.currentVersion}</strong> is up-to-date
      </span>
    </p>`
  }
  else {
    return yo`<p>
      <button class="btn btn-default" onclick=${onClickCheckUpdates}>Check for updates</button>
      <span class="s-version-info">
        <span class="icon icon-check"></span>
        <strong>Beaker v${updateInfo.currentVersion}</strong> is up-to-date
      </span>
    </p>`
  }
}

// event handlers
// =

function onClickCheckUpdates () {
  // TODO - trigger check

  updateInfo.isCheckingForUpdates = true
  render()

  setTimeout(() => {
    updateInfo.isCheckingForUpdates = false
    updateInfo.isUpdateAvailable = true
    render()
  }, 2e3)
}