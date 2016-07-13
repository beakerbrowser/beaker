import * as yo from 'yo-yo'

// exported API
// =

export function setup () {
}

export function show () {
  render()
}

export function hide () {
}

// rendering
// =

function render () {
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content" style="padding: 0 1em">
    <p><span class="icon icon-attention"></span> This page is a placeholder. It has not been implemented yet.</p>
  </div>`)
}