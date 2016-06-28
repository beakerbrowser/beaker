import * as sidenavUI from './ui/sidenav'
import * as bookmarks from './ui/bookmarks-view'
import * as mostVisited from './ui/most-visited-view'
import * as history from './ui/history-view'

// globals
// =

var views = { bookmarks, mostVisited, history }
var currentView = views.bookmarks

// setup
// =

sidenavUI.setup()
for (var id in views)
  views[id].setup()
views.bookmarks.show()

// ui events
// =

sidenavUI.on('change-view', id => {
  if (currentView)
    currentView.hide()
  currentView = views[id]
  currentView.show()
})