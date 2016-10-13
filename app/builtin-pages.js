import EE from 'events'
import * as sidenavUI from './builtin-pages/com/sidenav'
import * as favorites from './builtin-pages/views/favorites'
import * as archives from './builtin-pages/views/archives'
import * as history from './builtin-pages/views/history'
import * as downloads from './builtin-pages/views/downloads'
import * as settings from './builtin-pages/views/settings'

// HACK FIX
// weird bug, prependListener is expected but missing?
// - prf
EE.prototype.prependListener = EE.prototype.on

// HACK FIX2
// the good folk of whatwg didnt think to include an event for pushState(), so let's add one
// -prf
var _wr = function(type) {
  var orig = window.history[type];
  return function() {
    var rv = orig.apply(this, arguments);
    var e = new Event(type.toLowerCase());
    e.arguments = arguments;
    window.dispatchEvent(e);
    return rv;
  };
};
window.history.pushState = _wr('pushState')
window.history.replaceState = _wr('replaceState');

// globals
// =

var views = { start: favorites, archives, history, downloads, settings }
var currentView = getLocationView()

// setup
// =

sidenavUI.setup()
for (var slug in views)
  views[slug].setup()
currentView.show()

// ui events
// =

window.addEventListener('pushstate', onURLChange)
window.addEventListener('popstate', onURLChange)

function onURLChange () {
  // teardown old view
  if (currentView)
    currentView.hide()

  // render new view
  currentView = getLocationView()
  currentView.show()
}

// internal methods
// =

function getLocationView () {
  var slug = window.location.pathname.split('/').shift()
  return views[slug]
}