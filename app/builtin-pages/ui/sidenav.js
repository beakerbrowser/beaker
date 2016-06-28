import * as yo from 'yo-yo'
import EventEmitter from 'events'

// globals
// =

var currentNavItem = 'bookmarks'
var events = new EventEmitter()
const navItems = {
  bookmarks: { icon: 'star', label: 'All My Bookmarks' },
  mostVisited: { icon: 'chart-area', label: 'Most Visited' },
  history: { icon: 'back-in-time', label: 'Full History' },
}

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
    <h5 class="nav-group-title">Bookmarks</h5>
    ${renderNavItem('bookmarks')}
    <h5 class="nav-group-title">History</h5>
    ${renderNavItem('mostVisited')}
    ${renderNavItem('history')}
  </nav>`
}

function renderNavItem (id) {
  var item = navItems[id]
  if (!item) return ''
  var { icon, label } = item
  var isActive = currentNavItem == id
  return yo`<a class=${'nav-group-item' + (isActive?' active':'')} onclick=${onClickNavItem(id)}>
    <span class=${'icon icon-'+icon}></span>
    ${label}
  </a>`
}

// event handlers
// =

function onClickNavItem (id) {
  return e => {
    currentNavItem = id
    events.emit('change-view', id)
    update()
  }
}