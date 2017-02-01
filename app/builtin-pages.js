import EE from 'events'
import * as favorites from './builtin-pages/views/favorites'
import * as archives from './builtin-pages/views/archives'
import * as history from './builtin-pages/views/history'
import * as downloads from './builtin-pages/views/downloads'
import * as settings from './builtin-pages/views/settings'
import { closeAllToggleables } from './builtin-pages/com/toggleable'

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
window.history.replaceState = _wr('replaceState')

// globals
// =

var views = { start: favorites, library: archives, history, downloads, settings }
var currentView = getLocationView()

// setup
// =

for (var slug in views)
  views[slug].setup()
currentView.show()

// ui events
// =

window.addEventListener('pushstate', onURLChange)
window.addEventListener('popstate', onURLChange)
window.addEventListener('render', () => currentView.render())
document.body.addEventListener('click', onAnyClick, true)

function onURLChange () {
  var newView = getLocationView()
  var isSameView = currentView === newView

  // teardown old view
  closeAllToggleables()
  if (currentView)
    currentView.hide(isSameView)

  // render new view
  currentView = newView
  currentView.show(isSameView)
}

function onAnyClick () {
  // close the toggleables on all click events
  closeAllToggleables()
}

// internal methods
// =

function getLocationView () {
  var slug = window.location.pathname.split('/').shift()
  return views[slug]
}