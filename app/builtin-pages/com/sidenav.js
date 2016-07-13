import * as yo from 'yo-yo'
import EventEmitter from 'events'

// globals
// =

var events = new EventEmitter()
const navItems = [
  'Browse',
  { url: 'beaker:start', icon: 'star', label: 'Favorites' },
  { url: 'beaker:apps', icon: 'window', label: 'Applications' },
  { url: 'beaker:shared-folders', icon: 'folder', label: 'Shared Folders' },
  { url: 'beaker:history', icon: 'back-in-time', label: 'History' },
  // 'My Computer',
  // { url: 'beaker:downloads', icon: 'install', label: 'Downloads' },
  // { url: 'beaker:publish', icon: 'upload', label: 'Publish' },
  // { url: 'beaker:disk-usage', icon: 'chart-pie', label: 'Disk Usage' }, TODO
  // { url: 'beaker:network', icon: 'network', label: 'Network' }, TODO
  // { url: 'beaker:settings', icon: 'tools', label: 'Settings' }
]

// exported API
// =

export function setup () {
  document.getElementById('el-sidenav').appendChild(render())
}

export function update () {
  yo.update(document.querySelector('#el-sidenav nav'), render())
}

export var on = events.on.bind(events)

// rendering
// =

function render () {
  return yo`<nav class="nav-group">
    ${navItems.map(renderNavItem)}
  </nav>`
}

function renderNavItem (item) {
  // render headers (represented by just a string)
  if (typeof item == 'string')
    return yo`<h5 class="nav-group-title">${item}</h5>`

  // render items
  var { url, icon, label } = item
  var isActive = window.location == url
  return yo`<a class=${'nav-group-item' + (isActive?' active':'')} onclick=${onClickNavItem(item)}>
    <span class=${'icon icon-'+icon}></span>
    ${label}
  </a>`
}

// event handlers
// =

function onClickNavItem (item) {
  return e => {
    window.history.pushState(null, '', item.url)
    events.emit('change-view', item.url)
    update()
  }
}
