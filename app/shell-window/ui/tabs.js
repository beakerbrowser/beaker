import * as yo from 'yo-yo'
import * as pages from '../pages'
import * as navbar from './navbar'
import { remote, ipcRenderer } from 'electron'
import { debounce, throttle } from '../../lib/functions'

// constants
// =

const MAX_TAB_WIDTH = 160 // px
const MIN_TAB_WIDTH = 16 // px
const TAB_SPACING = 25 // px

// globals
// =

// tab-width is adjusted based on window width and # of tabs
var currentTabWidth = MAX_TAB_WIDTH

// exported methods
// ==

export function setup () {
  pages.on('update', updateTabs)
  pages.on('add', onAddTab)
  pages.on('remove', onRemoveTab)
  pages.on('set-active', updateTabs)
  pages.on('did-start-loading', updateTabs)
  pages.on('did-stop-loading', updateTabs)
  pages.on('page-title-updated', updateTabs)
  pages.on('page-favicon-updated', updateTabFavicon)
  window.addEventListener('resize', debounce(onWindowResize, 500))
}

// update functions
// =

function updateTabs (e) {
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

  // compute add btn styles
  var addBtnStyle = `transform: translateX(${getTabX(allPages, allPages.length)}px)`

  // render
  yo.update(document.getElementById('toolbar-tabs'), yo`<div id="toolbar-tabs" class="chrome-tabs-shell">
    <div class="chrome-tabs">
      ${allPages.map(drawTab)}
      <div class="chrome-tab chrome-tab-in-position chrome-tab-add-btn" onclick=${onClickNew} style=${addBtnStyle}>
        <div class="chrome-tab-favicon"><span class="icon icon-plus"></span></div>
        ${drawTabCurves()}
      </div>
    </div>
  </div>`)
}

function updateTabFavicon (e) {
  var page = pages.getByWebview(e.target)
  page.favicons = e.favicons
  updateTabs()  
}

// render functions
// =

function drawTab (page, i) {
  const isActive = page.isActive
  const isTabRendered = page.isTabRendered
  const isTabDragging = page.isTabDragging

  // position the tab
  var style = `
    transform: translateX(${getTabX(pages.getAll(), i)}px);
    width: ${getTabWidth(page)}px
  `

  // pick a favicon
  var favicon 
  if (page.isLoading()) {
    // loading spinner
    favicon = yo`<div class="spinner"></div>`
    if (!page.isReceivingAssets)
      favicon.classList.add('reverse')
  } else {
    // page's favicon
    if (page.favicons && page.favicons[0]) {
      favicon = yo`<img src=${page.favicons[0]}>`
      favicon.onerror = onFaviconError(page)
    }
    // fallback
    else if (!page.getURL().startsWith('beaker:'))
      favicon = yo`<img src="beaker-favicon:default">`
  }

  // class
  var cls = ''
  if (isActive) cls += ' chrome-tab-current'
  if (isTabRendered) cls += ' chrome-tab-in-position'
  if (isTabDragging) cls += ' chrome-tab-dragging'
  if (!favicon) cls += ' chrome-tab-nofavicon'

  // pinned rendering:
  if (page.isPinned) {
    return yo`<div class=${'chrome-tab chrome-tab-pinned'+cls}
                data-id=${page.id}
                onload=${onTabElLoad(page)}
                onclick=${onClickTab(page)}
                oncontextmenu=${onContextMenuTab(page)}
                onmousedown=${onMouseDown(page)}
                title=${page.getTitle()}
                style=${style}>
      <div class="chrome-tab-favicon">${favicon}</div>
      ${drawTabCurves()}
    </div>`
  }

  // normal rendering:

  return yo`
  <div class=${'chrome-tab'+cls}
      data-id=${page.id}
      onload=${onTabElLoad(page)}
      onclick=${onClickTab(page)}
      oncontextmenu=${onContextMenuTab(page)}
      onmousedown=${onMouseDown(page)}
      title=${page.getTitle()}
      style=${style}>
    <div class="chrome-tab-favicon">${favicon}</div>
    <div class="chrome-tab-title">${page.getTitle() || 'New tab'}</div>
    <div class="chrome-tab-close" onclick=${onClickTabClose(page)}></div>
    ${drawTabCurves()}
  </div>`
}

function drawTabCurves () {
  return yo`<div class="chrome-tab-curves">
    <div class="chrome-tab-curves-left"></div>
    <div class="chrome-tab-curves-right"></div>
  </div>`
}

// ui event handlers
// =

function onTabElLoad (page) {
  return e => {
    // once loaded, we can give the 'in-position' class
    setTimeout(() => {
      page.isTabRendered = true
      updateTabs()
    }, 215) // transition should take 200ms
  }
}

function onAddTab (page) {
  // do things?
}

function onRemoveTab (page) {
  // manually remove the tab element
  // - this forces the other tabs to animate into the correct place
  // - if not done, yo-yo would reuse a neighbor's elements, and no animation would occur
  var tabEl = document.querySelector(`.chrome-tab[data-id="${page.id}"]`)
  if (tabEl)
    tabEl.parentNode.removeChild(tabEl)
}

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
      updateTabs()
    }/*, 30)*/

    // drag handler
    function drag (e) {
      // calculate offset
      page.tabDragOffset = e.pageX - startX

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
    updateTabs()
  }
}

function onWindowResize (e) {
  updateTabs()
}

// internal helpers
// =

function getTabX (allPages, pageIndex) {
  // handle if given just a page object
  if (!Array.isArray(allPages)) {
    let page = allPages
    allPages = pages.getAll()
    pageIndex = allPages.indexOf(page)
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