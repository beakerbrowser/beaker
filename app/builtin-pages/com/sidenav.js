import * as yo from 'yo-yo'
import EventEmitter from 'events'

// globals
// =

var events = new EventEmitter()
const navItems = [
  'Browse',
  { url: 'beaker:start', icon: 'star', label: 'Favorites' },
  { url: 'beaker:history', icon: 'back-in-time', label: 'History' },

  'Shared Files',
  { url: 'beaker:subscriptions', icon: 'rss', label: 'Watched' },
  { url: 'beaker:owned', icon: 'folder', label: 'My Shared Folders' }
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
  if (typeof item == 'string' || item.innerHTML)
    return yo`<h5 class="nav-group-title">${item}</h5>`

  // render items
  var { url, icon, label } = item
  var isActive = window.location == url
  return yo`<a class=${'nav-group-item' + (isActive?' active':'')} href=${url} onclick=${onClickNavItem(item)}>
    <span class=${'icon icon-'+icon}></span>
    ${label}
  </a>`
}

// event handlers
// =

function onClickNavItem (item) {
  return e => {
    // ignore ctrl/cmd+click
    if (e.metaKey)
      return
    e.preventDefault()

    if (window.location.protocol == 'beaker:') {
      // just navigate virtually, if we're on a beaker: page
      window.history.pushState(null, '', item.url)
      events.emit('change-view', item.url)
      update()
    } else {
      // probably on view-dat:, so actually go to the page
      window.location = item.url
    }
  }
}
