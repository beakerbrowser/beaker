import * as yo from 'yo-yo'
import * as pages from '../pages'
import { remote, ipcRenderer } from 'electron'

export function setup () {
  pages.on('update', updateTabs)
  pages.on('set-active', updateTabs)
  pages.on('did-start-loading', updateTabs)
  pages.on('did-stop-loading', updateTabs)
  pages.on('page-title-updated', updateTabs)
  pages.on('page-favicon-updated', updateTabFavicon)
}

// update functions
// =

function updateTabs () {
  yo.update(document.getElementById('toolbar-tabs'), yo`<div id="toolbar-tabs" class="chrome-tabs-shell">
    <div class="chrome-tabs">
      ${pages.getAll().map(drawTab)}
      <div class="chrome-tab chrome-tab-add-btn" onclick=${onClickNew}>
        <div class="chrome-tab-favicon"><span class="icon icon-plus"></span></div>
        ${drawTabCurves()}
      </div>
    </div>
    <div class="chrome-shell-bottom-bar"></div>
  </div>`)
}

function updateTabFavicon (e) {
  var page = pages.getByWebview(e.target)
  page.favicons = e.favicons
  updateTabs()  
}

// render functions
// =

function drawTab (page) {
  var favicon 
  const isActive = page.isActive
  if (page.isLoading())
    favicon = yo`<span class="icon icon-hourglass"></span>`
  else {
    if (page.favicons && page.favicons[0]) {
      favicon = yo`<img src=${page.favicons[0]}>`
      favicon.onerror = onFaviconError(page)
    }
    else if (!page.getURL().startsWith('beaker:'))
      favicon = yo`<img src="beaker-favicon:default">`
  }

  if (page.isPinned) {
    return yo`<div class=${'chrome-tab chrome-tab-pinned'+(isActive?' chrome-tab-current':'')} data-id=${page.id} onclick=${onClickTab(page)} oncontextmenu=${onContextMenuTab(page)} title=${page.getTitle()}>
      <div class="chrome-tab-favicon">${favicon}</div>
      ${drawTabCurves()}
    </div>`
  }

  return yo`
  <div class=${'chrome-tab'+(isActive?' chrome-tab-current':'')+(!favicon?' chrome-tab-nofavicon':'')}
      data-id=${page.id}
      onclick=${onClickTab(page)}
      oncontextmenu=${onContextMenuTab(page)}
      title=${page.getTitle()}>
    <div class="chrome-tab-favicon">${favicon}</div>
    <div class="chrome-tab-title">${page.getTitle() || 'New tab'}</div>
    <div class="chrome-tab-close" onclick=${onClickTabClose(page)}></div>
    ${drawTabCurves()}
  </div>`
}

function drawTabCurves () {
  return yo`<div class="chrome-tab-curves">
    <div class="chrome-tab-curves-left-shadow"></div>
    <div class="chrome-tab-curves-left-highlight"></div>
    <div class="chrome-tab-curves-left"></div>
    <div class="chrome-tab-curves-right-shadow"></div>
    <div class="chrome-tab-curves-right-highlight"></div>
    <div class="chrome-tab-curves-right"></div>
  </div>`
}

// ui event handlers
// =

function onClickNew () {
  var page = pages.create()
  pages.setActive(page)
}

function onClickDuplicate (page) {
  return () => pages.create(page.getURL())
}

function onClickPin (page) {
  return () => pages.togglePinned(page)
}

function onClickTab (page) {
  return e => {
    // tabs have curved edges which arent modelable via the DOM
    // this creates a region of ~10px on each edge, which we need to smartly detect
    // (due to the asymmetrical margins, the numbers are more art than science)
    var { clientX, clientY } = e
    var tabEl = findTabParentEl(e.target)
    var { left, top, right, bottom } = tabEl.getBoundingClientRect()

    var leftEdge = clientX - left + 13
    var rightEdge = clientX - right - 11
    var bottomEdge = bottom - clientY

    if (leftEdge < 10) {
      // this edge forms a line from {leftEdge: -4, bottomEdge: 0} to {leftEdge: 0, bottomEdge: 12}
      // (y = mx + b) y = 3x + 12
      // if bottomEdge is > than (3*leftEdge + 12) then we're above the line
      let isOutside = (bottomEdge > (3 * leftEdge + 12))
      if (isOutside) {
        let leftPage = pages.getAdjacentPage(page, -1)
        page = leftPage || page
      }
    }

    if (rightEdge > 0) {
      // this edge forms a line from {rightEdge: 6, bottomEdge: 0} to {rightEdge: 0, bottomEdge: 12}
      // (y = mx + b) y = -2x + 12
      // if bottomEdge is > than (-2*rightEdge + 12) then we're above the line
      let isOutside = (bottomEdge > (-2 * rightEdge + 12))
      if (isOutside) {
        let rightPage = pages.getAdjacentPage(page, 1)
        if (rightPage)
          page = rightPage
        else {
          // unlike the left side, if there's not a tab here, then we clicked on new
          return onClickNew()
        }
      }
    }

    pages.setActive(page)
  }
}

function onClickTabClose (page) {
  return e => {
    if (e && e.preventDefault) {
      e.preventDefault()
      e.stopPropagation()
    }
    pages.remove(page)
  }
}

function onClickCloseOtherTabs (page) {
  return () => {
    pages.setActive(page)
    pages.getAll().forEach(p => {
      if (p != page)
        pages.remove(p)
    })
  }
}
function onClickCloseTabsToTheRight (page) {
  return () => {
    var ps = pages.getAll()
    var index = ps.indexOf(page)
    for (var i = ps.length - 1; i > index; i--)
      pages.remove(ps[i])
  }
}

function onContextMenuTab (page) {
  const { Menu, MenuItem, clipboard } = remote
  return e => {
    var menu = Menu.buildFromTemplate([
      { label: 'New Tab', click: onClickNew },
      { type: 'separator' },
      { label: 'Duplicate', click: onClickDuplicate(page) },
      { label: (page.isPinned) ? 'Unpin Tab' : 'Pin Tab', click: onClickPin(page) },
      { type: 'separator' },
      { label: 'Close Tab', click: onClickTabClose(page) },
      { label: 'Close Other Tabs', click: onClickCloseOtherTabs(page) },
      { label: 'Close Tabs to the Right', click: onClickCloseTabsToTheRight(page) }
    ])
    menu.popup(remote.getCurrentWindow())
  }
}

function onFaviconError (page) {
  return () => {
    // if the favicon 404s, just fallback to the icon
    page.favicons = null
    updateTabs()
  }
}

// internal helpers
// =

function findTabParentEl (el) {
  while (el) {
    if (el.classList && el.classList.contains('chrome-tab'))
      return el
    el = el.parentNode
  }
}