import * as pages from '../pages'

var isOpen = false
var isDragging = false

var webviewsEl
var sidebarEl
var sidebarWebview
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

export function open (url) {
  if (!isOpen) {
    sidebarEl.classList.add('open')
    createWebview(url)
    isOpen = true
  } else {
    sidebarWebview.loadURL(url)
  }
}

export function close () {
  if (isOpen) {
    sidebarEl.classList.remove('open')
    destroyWebview()
    isOpen = false
  }
}

// internal methods
// =

function createWebview (url) {
  // create webview
  sidebarWebview = pages.createWebviewEl('dat-sidebar-webview', url)
  sidebarWebview.addEventListener('ipc-message', pages.onIPCMessage)
  sidebarEl.appendChild(sidebarWebview)
  // resize other webviews
  var pageSize = document.body.getClientRects()[0]
  var sidebarSize = sidebarEl.getClientRects()[0]
  console.log(pageSize, sidebarSize, pageSize.width - sidebarSize.width)
  webviewsEl.style.width = `${pageSize.width - sidebarSize.width}px`
}

function destroyWebview () {
  sidebarEl.removeChild(sidebarWebview)
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