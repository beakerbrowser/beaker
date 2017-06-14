import * as pages from '../pages'

var isOpen = false
var isDragging = false

var webviewsEl
var sidebarEl
var sidebarWebviews = {} // pageId => webview element
var dragHandleEl

// exported api
// =

export function getIsOpen () {
  return isOpen
}

export function setup () {
  webviewsEl = document.getElementById('webviews')
  sidebarEl = document.getElementById('dat-sidebar')
  dragHandleEl = document.getElementById('dat-sidebar-draghandle')
  dragHandleEl.addEventListener('mousedown', onDragMouseDown)
  dragHandleEl.addEventListener('mouseup', onDragMouseUp)
}

export function open (page) {
  if (!page || !page.id) {
    return console.log(new Error('Passed a bad page object'))
  }

  if (!isOpen) {
    isOpen = true
    sidebarEl.classList.add('open')

    // resize main webviews
    var pageSize = document.body.getClientRects()[0]
    var sidebarSize = sidebarEl.getClientRects()[0]
    webviewsEl.style.width = `${pageSize.width - sidebarSize.width}px`
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

export function close () {
  if (isOpen) {
    isOpen = false
    sidebarEl.classList.remove('open')
    destroyWebviews()
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
  webviewsEl.style.width = '100%'
}

// resizing behaviors
// =

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
  webviewsEl.style.width = `${e.x}px`
  sidebarEl.style.width = `${(pageSize.width - e.x)}px`
}