/* globals URL DatArchive */

import EventEmitter from 'events'
import * as pages from '../pages'

var events = new EventEmitter()
var webviewsEl
var sidebarEl
var dragHandleEl
var activePanel
var panels = {} // pageId => {webview: Element, target: String (the url)}
var sidebarWidth = 310

// exported api
// =

export function on (...args) {
  events.on.apply(events, args)
}

export function getIsOpen (page) {
  page = page || pages.getActive()
  return (page.id in panels)
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

export function toggle (page) {
  if (getIsOpen(page)) close(page)
  else open(page)
}

export function open (page) {
  if (getIsOpen(page)) return
  setActivePanel(setupPanel(page || pages.getActive()))
  setActivePanelVisibility()
  events.emit('change')
}

export function close (page) {
  page = page || pages.getActive()
  if (!getIsOpen(page)) return
  destroyPanel(page.id)
  setActivePanelVisibility()
  events.emit('change')
}

export function onPageChangeLocation (page) {
  if (!getIsOpen(page)) return
  setupPanel(page)
  setActivePanelVisibility()
  events.emit('change')
}

export function onPageSetActive (page) {
  setActivePanel(panels[page.id])
  setActivePanelVisibility()
  events.emit('change')
}

export function onPageClose (page) {
  if (!page || !page.id) {
    return console.log(new Error('Passed a bad page object'))
  }
  close(page)
}

// panel management
// =

function setupPanel (page) {
  // only make visible for dat pages
  if (!page.url.startsWith('dat://')) {
    destroyPanel(page.id)
    return null
  }

  // get/create the panel
  var panel = panels[page.id]
  if (!panel) {
    panel = panels[page.id] = {webview: null, target: null}
  }
  var oldUrl = panel.target
  panel.target = page.url
  var wvUrl = `beaker://dat-sidebar/${page.url}`

  // create/update webview as needed
  if (!panel.webview) {
    var wv = pages.createWebviewEl('dat-sidebar-webview', wvUrl)
    wv.addEventListener('ipc-message', pages.onIPCMessage)
    sidebarEl.appendChild(wv)
    panel.webview = wv
  } else {
    // only load a new URL if the domain has changed
    checkIsNewLocation()
    async function checkIsNewLocation () {
      let isNewLocation = true
      try {
        let oldUrlParsed = new URL(oldUrl)
        let newUrlParsed = new URL(page.url)
        if (oldUrlParsed.protocol === newUrlParsed.protocol) {
          // resolve the DNS
          let [oldKey, newKey] = await Promise.all([
            DatArchive.resolveName(oldUrlParsed.hostname),
            DatArchive.resolveName(newUrlParsed.hostname)
          ])
          if (oldKey === newKey) {
            isNewLocation = false
          }
        }
      } catch (e) { /* ignore */ }
      if (isNewLocation) {
        panel.webview.loadURL(wvUrl)
      }
    }
  }

  return panel
}

function setActivePanel (panel) {
  activePanel = panel
}

function destroyPanel (id) {
  var panel = panels[id]
  if (!panel) return
  if (panel.webview) {
    sidebarEl.removeChild(panel.webview)
  }
  if (activePanel === panel) {
    activePanel = null
  }
  delete panels[id]
}

// sidebar rendering
// =

function setActivePanelVisibility () {
  if (!activePanel) {
    hideSidebar()
    return
  }

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
    if (panels[id]) {
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
