import * as yo from 'yo-yo'
import EventEmitter from 'events'

// globals
// =

var currentNavItem = 'favorites'
var events = new EventEmitter()
const navItems = {
  favorites: { icon: 'star', label: 'Favorites' },
  history: { icon: 'back-in-time', label: 'History' },
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
    <h5 class="nav-group-title">Get Started</h5>
    ${renderNavItem('favorites')}
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