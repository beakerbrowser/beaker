import * as yo from 'yo-yo'
import { remote } from 'electron'

// exported API
// =

export function setup () {
  render()
}

// internal methods
// =

function render () {
  var el = document.getElementById('win32-titlebar')
  yo.update(el, yo`<div id="win32-titlebar">
    <a class="win32-titlebar-btn win32-titlebar-minimize" onclick=${onClickMinimize}></a>
    <a class="win32-titlebar-btn win32-titlebar-maximize" onclick=${onClickMaximize}></a>
    <a class="win32-titlebar-btn win32-titlebar-close" onclick=${onClickClose}></a>
  </div>`)
}

// event handlers
// =

function onClickMinimize () {
  remote.getCurrentWindow().minimize()
}

function onClickMaximize () {
  var win = remote.getCurrentWindow()
  if (win.isMaximized()) {
    win.unmaximize()
  } else {
    win.maximize()
  }
}

function onClickClose () {
  remote.getCurrentWindow().close()
}