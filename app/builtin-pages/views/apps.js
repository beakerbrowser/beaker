/*
This uses the beakerBookmarks APIs, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'

// globals
// =

// exported API
// =

export function setup () {
}

export function show () {
  document.title = 'Applications'
  render()
}

export function hide () {
}

// rendering
// =

function render () {
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    todo
  </div>`)
}

// event handlers
// =
