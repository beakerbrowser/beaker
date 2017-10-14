/* globals beaker */

import yo from 'yo-yo'

// main
// =
let workspaceInfo

setup()
async function setup () {
  workspaceInfo = {
    title: 'blog',
    origin: 'dat://123456',
    localPath: '/Users/tara/src/taravancil.com',
    revisions: []
  }
  render()
}

// events
// =

function render () {
  yo.update(document.querySelector('.workspaces-wrapper'), yo`
    <div class="workspaces-wrapper builtin-wrapper">
      <div class="builtin-main">
        ${renderHeader()}
        <div class="view">hi</div>
      </div>
    </div>
  `)
}

function renderHeader () {
}