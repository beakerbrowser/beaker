import EE from 'events'
import * as sidenavUI from './builtin-pages/com/sidenav'
import * as favorites from './builtin-pages/views/favorites'
import * as sites from './builtin-pages/views/sites'
import * as history from './builtin-pages/views/history'
import * as downloads from './builtin-pages/views/downloads'
import * as settings from './builtin-pages/views/settings'

// HACK FIX
// weird bug, prependListener is expected but missing?
// - prf
EE.prototype.prependListener = EE.prototype.on

// globals
// =

var views = { start: favorites, sites, history, downloads, settings }
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