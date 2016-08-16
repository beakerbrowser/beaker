import * as yo from 'yo-yo'
import co from 'co'
import EventEmitter from 'events'

// globals
// =

var events = new EventEmitter()
var navItems = [
  { href: 'beaker:start', label: 'Favorites' },
  { href: 'beaker:history', label: 'History' },
  { href: 'beaker:settings', label: 'Settings' }
]

co(function *() {
  // fetch dynamic nav items
  var moreNavItems = yield beakerBrowser.getHomePages()
  moreNavItems = moreNavItems.filter(item => (typeof item.href == 'string') && (typeof item.label == 'string'))
  navItems = navItems.concat(moreNavItems)
  update()
})

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
    <h1>Beaker</h1>
    ${navItems.map(renderNavItem)}
  </nav>`
}

function renderNavItem (item) {
  // render headers (represented by just a string)
  if (typeof item == 'string' || item.innerHTML)
    return yo`<h5 class="nav-group-title">${item}</h5>`

  // render items
  var { href, label } = item
  var isActive = window.location == href
  return yo`<a class=${'nav-group-item' + (isActive?' active':'')} href=${href} onclick=${onClickNavItem(item)}>
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

    if (window.location.protocol == 'beaker:' && item.href.startsWith('beaker:')) {
      // just navigate virtually, if we're on and going to a beaker: page
      window.history.pushState(null, '', item.href)
      events.emit('change-view', item.href)
      update()
    } else {
      // actually go to the page
      window.location = item.href
    }
  }
}
