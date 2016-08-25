/*
This uses the beakerDownloads API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import emitStream from 'emit-stream'

// globals
// =

// exported API
// =

export function setup () {
}

export function show () {
  document.title = 'Your Sites'
  co(function* () {
    render()
  })
}

export function hide () {
}

// rendering
// =

function render () {
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="downloads">
      <div class="ll-heading">
        Your Sites
        <button class="btn">New Site</button>
      </div>
      todo
    </div>
  </div>`)
}