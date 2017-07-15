/* globals URL */

import EventEmitter from 'events'
import * as pages from '../pages'

var isOpen = false

var events = new EventEmitter()
var webviewsEl
var sidebarEl
var dragHandleEl
var activePanel
var panels = {} // pageId => {webview: Element,visible: boolean}
var sidebarWidth = 310

// exported api
// =

export function on (...args) {
  events.on.apply(events, args)
}

export function getIsOpen () {
  return isOpen
}

export function getIsAvailable () {
  var page = pages.getActive()
  return (page && page.url && page.url.startsWith('dat://'))
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
  if (!isOpen) {
    isOpen = true
    events.emit('change')
  }

  setActivePanel(setupPanel(page || pages.getActive()))
  setActivePanelVisibility()
}

export function close () {
  if (isOpen) {
    isOpen = false
    hideSidebar()
    destroyPanels()
    events.emit('change')
  }
}

export function onPageChangeLocation (page) {
  if (!isOpen) return
  setupPanel(page)
  setActivePanelVisibility()
  events.emit('change')
}

export function onPageSetActive (page) {
  if (!isOpen) return
  setActivePanel(setupPanel(page))
  setActivePanelVisibility()
  events.emit('change')
}

export function onPageClose (page) {
  if (!page || !page.id) {
    return console.log(new Error('Passed a bad page object'))
  }
  if (!isOpen || !(page.id in panels)) {
    return
  }
  destroyPanel(page.id)
  events.emit('change')
}

// panel management
// =

function setupPanel (page) {
  // get/create the panel
  var panel = panels[page.id]
  if (!panel) {
    panel = panels[page.id] = {webview: null, target: null, visible: false}
  }
  var oldUrl = panel.target
  panel.target = page.url

  // only make visible for dat pages
  panel.visible = page.url.startsWith('dat://')

  if (panel.visible) {
    var wvUrl = `beaker://dat-sidebar/${page.url}`

    // create/update webview as needed
    if (!panel.webview) {
      var wv = pages.createWebviewEl('dat-sidebar-webview', wvUrl)
      wv.addEventListener('ipc-message', pages.onIPCMessage)
      sidebarEl.appendChild(wv)
      panel.webview = wv
    } else {
      // only load a new URL if the domain has changed
      let isNewLocation = true
      try {
        let oldUrlParsed = new URL(oldUrl)
        let newUrlParsed = new URL(page.url)
        isNewLocation = (oldUrlParsed.origin !== newUrlParsed.origin)
      } catch (e) { /* ignore */ }
      if (isNewLocation) {
        panel.webview.loadURL(wvUrl)
      }
    }
  } else {
    // destroy the webview as needed
    if (panel.webview) {
      sidebarEl.removeChild(panel.webview)
      panel.webview = null
    }
  }

  return panel
}

function setActivePanel (panel) {
  if (activePanel === panel) return
  activePanel = panel
}

function destroyPanel (id) {
  var panel = panels[id]
  if (panel.webview) {
    sidebarEl.removeChild(panel.webview)
  }
  delete panels[id]
}

function destroyPanels () {
  for (var id in panels) {
    destroyPanel(id)
  }
  panels = {}
}

// sidebar rendering
// =

function setActivePanelVisibility () {
  if (!activePanel) return
  if (activePanel.visible) {
    // hide all sidebar webviews
    for (var id in panels) {
      if (panels[id].webview) {
        panels[id].webview.classList.add('hidden')
      }
    }

    // make visible
    activePanel.webview.classList.remove('hidden')
    setTimeout(() => reflowWebview(activePanel.webview), 60)
    showSidebar()
  } else {
    hideSidebar()
  }
}

function showSidebar () {
  sidebarEl.classList.add('open')
  doResize()
}

function hideSidebar () {
  sidebarEl.classList.remove('open')
  doResize()
}

// HACK
// on some devices, the webview has some rendering errors
// by triggering a reflow, we seem to force the errors to resolve
// -prf
function reflowWebview (el) {
  el.style.width = 'auto'
  // trigger reflow
  el.offsetHeight // eslint-disable-line no-unused-expressions
  el.style.width = '100%'
}

// resizing behaviors
// =

function doResize () {
  // set the sidebar width
  sidebarEl.style.width = `${sidebarWidth}px`

  // resize each webview individually
  var pageSize = document.body.getClientRects()[0]
  Array.from(webviewsEl.querySelectorAll('webview')).forEach(wv => {
    var id = wv.dataset.id || ''
    if (isOpen && panels[id] && panels[id].visible) {
      wv.style.width = `${pageSize.width - sidebarWidth}px`
    } else {
      wv.style.width = '100%'
    }
  })
}

function onDragMouseDown (e) {
  window.addEventListener('mousemove', onDragMouseMove)
  window.addEventListener('mouseup', onDragMouseUp, {once: true})
}

function onDragMouseUp (e) {
  window.removeEventListener('mousemove', onDragMouseMove)
}

function onDragMouseMove (e) {
  var pageSize = document.body.getClientRects()[0]
  sidebarWidth = pageSize.width - e.x
  if (sidebarWidth < 310) sidebarWidth = 310
  doResize()
}
