import * as sidenavUI from './ui/sidenav'
import * as favorites from './ui/favorites-view'
import * as history from './ui/history-view'

// globals
// =

var views = { favorites, history }
var currentView = views.favorites

// setup
// =

sidenavUI.setup()
for (var id in views)
  views[id].setup()
views.favorites.show()

// ui events
// =

sidenavUI.on('change-view', id => {
  if (currentView)
    currentView.hide()
  currentView = views[id]
  currentView.show()
})