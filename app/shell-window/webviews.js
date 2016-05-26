import EventEmitter from 'events'

// globals
// =

var webviewsDiv = document.getElementById('webviews')
var webviews = []
var activeWebview = null
var events = new EventEmitter()

// exported functions
// =

export function on (...args) {
  events.on.apply(events, args)
}

export function getAll() {
  return webviews
}

export function add (url) {
  // create wv
  var el = createEl(url)
  hide(el) // hidden by default
  webviewsDiv.appendChild(el)
  webviews.push(el)

  // emit
  events.emit('add', el)
  events.emit('update')

  // register events
  el.addEventListener('load-commit', rebroadcastEvent)
  el.addEventListener('did-finish-load', rebroadcastEvent)
  el.addEventListener('did-fail-load', rebroadcastEvent)
  el.addEventListener('did-start-loading', rebroadcastEvent)
  el.addEventListener('did-stop-loading', rebroadcastEvent)
  el.addEventListener('did-get-response-details', rebroadcastEvent)
  el.addEventListener('did-get-redirect-request', rebroadcastEvent)
  el.addEventListener('dom-ready', rebroadcastEvent)
  el.addEventListener('page-title-updated', rebroadcastEvent)
  el.addEventListener('page-favicon-updated', rebroadcastEvent)
  el.addEventListener('console-message', rebroadcastEvent)
  el.addEventListener('will-navigate', rebroadcastEvent)
  el.addEventListener('did-navigate', rebroadcastEvent)
  el.addEventListener('did-navigate-in-page', rebroadcastEvent)

  // make active if none others are
  if (!activeWebview)
    setActive(el)

  return el
}

export function setActive (el) {
  if (activeWebview) {
    hide(activeWebview)
    delete activeWebview.dataset.isActive
  }
  activeWebview = el
  show(el)
  el.dataset.isActive = 1
  events.emit('set-active', el)
}

export function getActive () {
  return activeWebview
}

export function getById (id) {
  for (var i=0; i < webviews.length; i++) {
    if (webviews[i].dataset.id == id)
      return webviews[i]
  }
  return null
}

// internal functions
// =

function show (el) {
  el.classList.remove('hidden')
  events.emit('show', el)
}

function hide (el) {
  el.classList.add('hidden')
  events.emit('hide', el)
}

function createEl (url) {
  var el = document.createElement('webview')
  el.dataset.id = (Math.random()*1000|0) + Date.now()
  el.setAttribute('preload', 'webview-preload.js')
  el.setAttribute('src', url || 'https://github.com')
  return el
}

function rebroadcastEvent (e) {
  events.emit(e.type, e)
}