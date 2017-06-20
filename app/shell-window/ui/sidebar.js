import EventEmitter from 'events'
import * as pages from '../pages'

var isOpen = false
var isDragging = false

var events = new EventEmitter()
var webviewsEl
var sidebarEl
var sidebarWebviews = {} // pageId => webview element
var dragHandleEl
var sidebarWidth = 300

// exported api
// =

export function on (...args) {
  events.on.apply(events, args)
}

export function getIsOpen () {
  return isOpen
}

export function setup () {
  webviewsEl = document.getElementById('webviews')
  sidebarEl = document.getElementById('dat-sidebar')
  dragHandleEl = document.getElementById('dat-sidebar-draghandle')
  dragHandleEl.addEventListener('mousedown', onDragMouseDown)
  dragHandleEl.addEventListener('mouseup', onDragMouseUp)
  window.addEventListener('resize', doResize)
}

export function toggle () {
  if (isOpen) close()
  else open()
}

export function open (page) {
  if (!page || !page.id) {
    page = pages.getActive()
  }

  if (!isOpen) {
    isOpen = true
    sidebarEl.classList.add('open')
    doResize()
    events.emit('change')
  }

  // create the webview for the given page, if dne
  getOrCreateWebview(page)
}

export function updatePage (page) {
  if (!isOpen) {
    // abort, we're closed
    return
  }

  // get page's webview
  var wv = sidebarWebviews[page.id]
  if (!wv) {
    // abort, the wv isnt loaded yet
    return
  }

  // load a new URL if the domain has changed
  var oldUrl = wv.dataset.target
  var newUrl = page.url
  try {
    var oldUrlParsed = new URL(oldUrl)
    var newUrlParsed = new URL(newUrl)
    if (oldUrlParsed.origin === newUrlParsed.origin) {
      // abort, origin hasnt changed
      return
    }
  } catch (e) {/* ignore */}

  // load the new url
  wv.dataset.target = newUrl
  wv.loadURL(`beaker://dat-sidebar/${newUrl}`)
}

export function setActive (page) {
  if (!isOpen) {
    // abort, we're closed
    return
  }

  // create the webview for the given page, if dne
  var wv = getOrCreateWebview(page)

  // set active
  for (var id in sidebarWebviews) {
    sidebarWebviews[id].classList.add('hidden')
  }
  wv.classList.remove('hidden')
}

export function closePage (page) {
  if (!page || !page.id) {
    return console.log(new Error('Passed a bad page object'))
  }

  if (!isOpen || !(page.id in sidebarWebviews)) {
    // abort
    return
  }

  // remove webview
  sidebarEl.removeChild(sidebarWebviews[page.id])
  delete sidebarWebviews[page.id]
}

export function close () {
  if (isOpen) {
    isOpen = false
    sidebarEl.classList.remove('open')
    destroyWebviews()
    doResize()
    events.emit('change')
  }
}

// internal methods
// =

function getOrCreateWebview (page) {
  if (sidebarWebviews[page.id]) {
    return sidebarWebviews[page.id]
  }

  // create webview
  var url = `beaker://dat-sidebar/${page.url}`
  var wv = pages.createWebviewEl('dat-sidebar-webview', url)
  wv.dataset.target = page.url
  wv.addEventListener('ipc-message', pages.onIPCMessage)
  sidebarEl.appendChild(wv)
  sidebarWebviews[page.id] = wv
  return wv
}

function destroyWebviews () {
  for (var id in sidebarWebviews) {
    sidebarEl.removeChild(sidebarWebviews[id])
  }
  sidebarWebviews = {}
}

// resizing behaviors
// =

function doResize () {
  if (isOpen) {
    var pageSize = document.body.getClientRects()[0]
    webviewsEl.style.width = `${pageSize.width - sidebarWidth}px`
    sidebarEl.style.width = `${sidebarWidth}px`
  } else {
    webviewsEl.style.width = '100%'    
  }
}

function onDragMouseDown (e) {
  isDragging = true
  window.addEventListener('mousemove', onDragMouseMove)
  window.addEventListener('mouseup', onDragMouseUp, {once: true})
}

function onDragMouseUp (e) {
  isDragging = false
  window.removeEventListener('mousemove', onDragMouseMove)
}

function onDragMouseMove (e) {
  var pageSize = document.body.getClientRects()[0]
  sidebarWidth = pageSize.width - e.x
  if (sidebarWidth < 300) sidebarWidth = 300
  webviewsEl.style.width = `${pageSize.width - sidebarWidth}px`
  sidebarEl.style.width = `${sidebarWidth}px`
}