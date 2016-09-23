import * as yo from 'yo-yo'
import * as pages from '../pages'
import * as navbar from './navbar'
import { remote } from 'electron'
import { debounce, throttle } from '../../lib/functions'

// constants
// =

const MAX_TAB_WIDTH = 200 // px
const MIN_TAB_WIDTH = 46 // px
const TAB_SPACING = 0 // px

// globals
// =

var tabsContainerEl

// tab-width is adjusted based on window width and # of tabs
var currentTabWidth = MAX_TAB_WIDTH

// exported methods
// ==

export function setup () {
  // render
  tabsContainerEl = yo`<div class="chrome-tabs">
    <div class="chrome-tab chrome-tab-add-btn" onclick=${onClickNew}>
      <div class="chrome-tab-favicon"><span class="icon icon-plus"></span></div>
    </div>
  </div>`
  yo.update(document.getElementById('toolbar-tabs'), yo`<div id="toolbar-tabs" class="chrome-tabs-shell">
    ${tabsContainerEl}
  </div>`)

  // wire up listeners
  pages.on('add', onAddTab)
  pages.on('remove', onRemoveTab)
  pages.on('set-active', onSetActive)
  pages.on('pin-updated', onPinUpdated)
  pages.on('did-start-loading', onUpdateTab)
  pages.on('did-stop-loading', onUpdateTab)
  pages.on('page-title-updated', onUpdateTab)
  pages.on('page-favicon-updated', onUpdateTab)
  window.addEventListener('resize', debounce(onWindowResize, 500))
}

// render functions
// =

function drawTab (page) {
  const isActive = page.isActive
  const isTabDragging = page.isTabDragging && (page.tabDragOffset !== 0)

  // pick a favicon
  var favicon 
  if (page.isLoading()) {
    // loading spinner
    favicon = yo`<div class="spinner"></div>`
    if (!page.isReceivingAssets)
      favicon.classList.add('reverse')
  } else {
    // page's explicit favicon
    if (page.favicons && page.favicons[0]) {
      favicon = yo`<img src=${page.favicons[0]}>`
      favicon.onerror = onFaviconError(page)
    }
    // fallbacks
    else if (page.getURL().startsWith('beaker:'))
      favicon = yo`<img src="beaker-favicon:beaker">`
    else // fallback to a potentially-cached icon
      favicon = yo`<img src="beaker-favicon:${page.getURL()}">`
  }

  // class
  var cls = ''
  if (isActive) cls += ' chrome-tab-current'
  if (isTabDragging) cls += ' chrome-tab-dragging'

  // pinned rendering:
  if (page.isPinned) {
    return yo`<div class=${'chrome-tab chrome-tab-pinned'+cls}
                data-id=${page.id}
                style=${getPageStyle(page)}
                onclick=${onClickTab(page)}
                oncontextmenu=${onContextMenuTab(page)}
                onmousedown=${onMouseDown(page)}
                title=${page.getTitle()}>
      <div class="chrome-tab-favicon">${favicon}</div>
    </div>`
  }

  // normal rendering:

  return yo`
  <div class=${'chrome-tab'+cls}
      data-id=${page.id}
      style=${getPageStyle(page)}
      onclick=${onClickTab(page)}
      oncontextmenu=${onContextMenuTab(page)}
      onmousedown=${onMouseDown(page)}
      title=${page.getTitle()}>
    <div class="chrome-tab-favicon">${favicon}</div>
    <div class="chrome-tab-title">${page.getTitle() || 'New tab'}</div>
    <div class="chrome-tab-close" onclick=${onClickTabClose(page)}></div>
  </div>`
}

// calculate and position all tabs
// - should be called any time the # of pages changes, or pin/unpin 
function repositionTabs (e) {
  const allPages = pages.getAll()

  // compute tab width for the space we have
  // - we need to distributed the space among unpinned tabs
  var numUnpinnedTabs = 0
  var availableWidth = window.innerWidth
  // correct for traffic lights on darwin
  if (window.process.platform == 'darwin' && !document.body.classList.contains('fullscreen'))
    availableWidth -= 80 
  // correct for new-tab btn
  availableWidth -= (MIN_TAB_WIDTH + TAB_SPACING)
  // count the unpinned-tabs, and correct for the spacing and pinned-tabs
  allPages.forEach(p => {
    availableWidth -= TAB_SPACING
    if (p.isPinned) availableWidth -= MIN_TAB_WIDTH
    else            numUnpinnedTabs++
  })
  // now calculate a (clamped) size
  currentTabWidth = Math.min(MAX_TAB_WIDTH, Math.max(MIN_TAB_WIDTH, availableWidth / numUnpinnedTabs))|0

  // update tab positions
  allPages.forEach(page => getTabEl(page, tabEl => tabEl.style = getPageStyle(page)))
  tabsContainerEl.querySelector('.chrome-tab-add-btn').style = getPageStyle(allPages.length)
}

// page event
// =

function onAddTab (page) {
  tabsContainerEl.insertBefore(drawTab(page), tabsContainerEl.querySelector('.chrome-tab-add-btn'))
  repositionTabs()
}

function onRemoveTab (page) {
  getTabEl(page, tabEl => tabEl.parentNode.removeChild(tabEl))
  repositionTabs()
}

function onUpdateTab (page) {
  getTabEl(page, tabEl => yo.update(tabEl, drawTab(page)))
}

function onPinUpdated (page) {
  getTabEl(page, tabEl => yo.update(tabEl, drawTab(page)))
  repositionTabs()
}

function onSetActive (page) {
  getTabEl(page, newTabEl => {
    // make old active tab inactive
    var oldTabEl = tabsContainerEl.querySelector('.chrome-tab-current')
    if (oldTabEl)
      oldTabEl.classList.remove('chrome-tab-current')

    // set new tab active
    newTabEl.classList.add('chrome-tab-current')
  })
}

// ui events
// =

function onClickNew () {
  var page = pages.create()
  pages.setActive(page)
  navbar.focusLocation(page)
}

function onClickDuplicate (page) {
  return () => pages.create(page.getURL())
}

function onClickPin (page) {
  return () => pages.togglePinned(page)
}

function onClickTab (page) {
  return e => pages.setActive(page)
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
    pages.getAll().slice().forEach(p => {
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

function onMouseDown (page) {
  return e => {

    // left-click only
    if (e.which !== 1) {
      return
    }

    // FIXME when you move your cursor out of the tabs, dragging stops working -prf

    // start drag behaviors
    var startX = e.pageX
    page.isTabDragging = true
    e.preventDefault()
    e.stopPropagation()

    // register drag-relevant listeners
    document.addEventListener('mousemove', drag, true)
    document.addEventListener('mouseup', dragend, true)
    // window.addEventListener('blur', dragend, true) TODO - needed?

    // throttle so we only rerender as much as needed
    // - actually throttling seems to cause jank
    var rerender = /*throttle(*/() => {
      repositionTabs()
    }/*, 30)*/

    // drag handler
    var hasSetDragClass = false
    function drag (e) {
      // calculate offset
      page.tabDragOffset = e.pageX - startX

      // set drag class (wait till actually moved, it looks better that way)
      if (!hasSetDragClass && page.tabDragOffset !== 0) {
        getTabEl(page, tabEl => tabEl.classList.add('chrome-tab-dragging'))
        hasSetDragClass = true
      }

      // do reorder?
      var reorderOffset = shouldReorderTab(page)
      if (reorderOffset) {
        // reorder, and recalc the offset
        if (pages.reorderTab(page, reorderOffset)) {
          startX += (reorderOffset * (page.isPinned ? 40 : getTabWidth(page)))
          page.tabDragOffset = e.pageX - startX
        }
      }

      // draw, partner
      rerender()
    }

    // done dragging handler
    function dragend (e) {
      // reset
      e.preventDefault()
      e.stopPropagation()
      page.tabDragOffset = 0
      page.isTabDragging = false
      getTabEl(page, tabEl => tabEl.classList.remove('chrome-tab-dragging'))
      document.removeEventListener('mousemove', drag, true)
      document.removeEventListener('mouseup', dragend, true)
      rerender()
    }
  }
}

function onFaviconError (page) {
  return () => {
    // if the favicon 404s, just fallback to the icon
    page.favicons = null
    onUpdateTab(page)
  }
}

function onWindowResize (e) {
  repositionTabs()
}

// internal helpers
// =

function getTabEl (page, cb) {
  var tabEl = tabsContainerEl.querySelector(`.chrome-tab[data-id="${page.id}"]`)
  if (cb && tabEl) cb(tabEl)
  return tabEl
}

function getTabX (pageIndex) {
  const allPages = pages.getAll()

  // handle if given just a page object
  if (typeof pageIndex != 'number') {
    pageIndex = allPages.indexOf(pageIndex)
  }

  // calculate base X off of the widths of the pages before it
  var x = 0
  for (var i = 0; i < pageIndex; i++)
    x += getTabWidth(allPages[i]) + TAB_SPACING

  // add the page offset
  if (allPages[pageIndex])
    x += allPages[pageIndex].tabDragOffset

  // done
  return x
}

function getTabWidth (page) {
  if (page.isPinned)
    return MIN_TAB_WIDTH
  return currentTabWidth
}

// this function looks weird because `page` is sometimes an index and sometimes a page object
// somebody ought to make it nicer. SOMEBODY. 
function getPageStyle (page) {
  const allPages = pages.getAll()
  var style = `transform: translateX(${getTabX(page)}px);`
  if (typeof page == 'object' || page < allPages.length)
    style += ` width: ${getTabWidth(page || allPages[page])}px;`
  return style
}

// returns 0 for no, -1 or 1 for yes (the offset)
function shouldReorderTab (page) {
  // has the tab been dragged far enough to change order?
  if (!page.isTabDragging)
    return 0

  var limit = (page.isPinned ? 40 : getTabWidth(page)) / 2
  if (page.tabDragOffset < -1 * limit)
    return -1
  if (page.tabDragOffset > limit)
    return 1
  return 0
}

function findTabParentEl (el) {
  while (el) {
    if (el.classList && el.classList.contains('chrome-tab'))
      return el
    el = el.parentNode
  }
}