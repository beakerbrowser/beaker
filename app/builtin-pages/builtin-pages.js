import EE from 'events'
import * as sidenavUI from './com/sidenav'
import * as favorites from './views/favorites'
import * as history from './views/history'
import * as subscriptions from './views/subscriptions'
import * as owned from './views/owned'
import * as TODO from './views/todo'

// HACK FIX
// weird bug, prependListener is expected but missing?
// - prf
EE.prototype.prependListener = EE.prototype.on

// globals
// =

var views = { start: favorites, history, subscriptions, 'owned': owned }
var currentView = getLocationView()

// setup
// =

sidenavUI.setup()
for (var slug in views)
  views[slug].setup()
currentView.show()

// ui events
// =

sidenavUI.on('change-view', url => {
  // teardown old view
  if (currentView)
    currentView.hide()

  // render new view
  currentView = getLocationView()
  currentView.show()
})

// internal methods
// =

function getLocationView () {
  return views[window.location.pathname]
}