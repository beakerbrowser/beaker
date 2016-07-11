import * as yo from 'yo-yo'

// globals
// =

// downloads, cached in memory
var downloads = []


// exported API
// =

export function setup () {
}

export function show () {
  // :TODO: fetch downloads
  render()
}

export function hide () {
}

// rendering
// =

function render () {

  var filesRows = [
    yo`<div class="fl-row">
      <div class="fl-name">beaker.app</div>
      <div class="fl-updated">Today</div>
      <div class="fl-size">301mb</div>
      <div class="fl-kind">OSX Application</div>
      <div class="fl-status">
        <progress value="70" max="100">70 %</progress>
        <span class="icon icon-down-thin"></span> 256 kB/s
      </div>
      <div class="fl-actions">
        <span class="icon icon-pause" title="Pause Download"></span>
      </div>
    </div>`,

    yo`<div class="fl-row">
      <div class="fl-name">beaker.msi</div>      
      <div class="fl-updated">Today</div>
      <div class="fl-size">344mb</div>
      <div class="fl-kind">Windows Installer</div>
      <div class="fl-status"><progress value="0" max="100">0 %</progress></div>
      <div class="fl-actions">
        <span class="icon icon-download" title="Start Download"></span>
      </div>
    </div>`,

    yo`<div class="fl-row">
      <div class="fl-name">beaker.deb</div>      
      <div class="fl-updated">Today</div>
      <div class="fl-size">298mb</div>
      <div class="fl-kind">Debian Package</div>
      <div class="fl-status"><progress value="0" max="100">0 %</progress></div>
      <div class="fl-actions">
        <span class="icon icon-download" title="Start Download"></span>
      </div>
    </div>`,
  ]

  var downloadsRows = [
    yo`<div class="fl-row">
      <div class="fl-name">Wikipedia.org</div>
      <div class="fl-updated">Today</div>
      <div class="fl-size">--</div>
      <div class="fl-kind">Application</div>
      <div class="fl-status"></div>
      <div class="fl-actions">
      </div>
    </div>`,

    yo`<div class="fl-row">
      <div class="fl-name">Hypermail</div>
      <div class="fl-updated">Today</div>
      <div class="fl-size">--</div>
      <div class="fl-kind">Application</div>
      <div class="fl-status">Downloading</div>
      <div class="fl-actions">
        <span class="icon icon-pause" title="Pause Download"></span>
      </div>
    </div>`,


    yo`<div class="fl-row selected">
      <div class="fl-name">Beaker Browser</div>
      <div class="fl-updated">Today</div>
      <div class="fl-size">--</div>
      <div class="fl-kind">Shared Folder</div>
      <div class="fl-status">Downloading</div>
      <div class="fl-actions">
        <span class="icon icon-pause" title="Pause Download"></span>
      </div>
    </div>`,

    yo`<div class="fl-row">
      <div class="fl-name">Latest cat gifs</div>
      <div class="fl-updated">Yesterday</div>
      <div class="fl-size">--</div>
      <div class="fl-kind">Application</div>
      <div class="fl-status"></div>
      <div class="fl-actions">
      </div>
    </div>`,

    yo`<div class="fl-row">
      <div class="fl-name">Flitter</div>
      <div class="fl-updated">Last Friday</div>
      <div class="fl-size">--</div>
      <div class="fl-kind">Application</div>
      <div class="fl-status">Paused</div>
      <div class="fl-actions">
        <span class="icon icon-play" title="Start Download"></span>
      </div>
    </div>`
  ]

  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div style="background: #ffe000; padding: 10px; border: 1px dashed; font-weight: bold"><span class="icon icon-attention"></span> This page is a mockup. It has not been implemented yet.</div>
    <div class="downloads">
      <div class="files-list">
        <div class="fl-head">
          <div class="fl-name">Name</div>
          <div class="fl-updated">Last Updated</div>
          <div class="fl-size">Size</div>
          <div class="fl-kind">Kind</div>
          <div class="fl-status">Status</div>
          <div class="fl-actions"></div>
        </div>
        <div class="fl-rows">
          ${downloadsRows}
        </div>
      </div>
      <div class="download-details">
        <div class="dd-bar">
          <div class="dd-name">Beaker Browser</div>
          <div class="dd-version">
            <span class="icon icon-back-in-time"></span>
            <select>
              <option>v1.0.1</option>
              <option>v1.0.0</option>
              <option>v0.1.5</option>
              <option>v0.1.4</option>
              <option>v0.1.3</option>
              <option>v0.1.2</option>
              <option>v0.1.1</option>
              <option>v0.1.0</option>
            </select>
          </div>
          <div class="dd-link">
            <span class="icon icon-link"></span>
            <a target="blank" href="dat://e7c86f3760f967574b9adcbd0dfeff22e83eb9e46bc96efdd5dccf05ade8b8d3/">dat://e7c86f3760f967574b9adcbd0dfeff22e83eb9e46bc96efdd5dccf05ade8b8d3/</a>
          </div>
        </div>
        <div class="files-list">
          <div class="fl-rows">
            ${filesRows}
          </div>
        </div>
      </div>
    </div>
  </div>`)
}

// event handlers
// =
