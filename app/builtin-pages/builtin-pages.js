import * as sidenavUI from './ui/sidenav'
import * as favorites from './ui/favorites-view'
import * as history from './ui/history-view'
import * as TODO from './ui/todo-view'

// globals
// =

var views = { start: favorites, apps: TODO, 'shared-folders': TODO, history, 'disk-usage': TODO, network: TODO, settings: TODO }
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