/* globals URL beaker */

import * as yo from 'yo-yo'
import debounce from 'lodash.debounce'
import * as pages from '../pages'
import * as navbar from './navbar'
import {remote} from 'electron'

// constants
// =

const MAX_TAB_WIDTH = 235 // px
const MIN_TAB_WIDTH = 48 // px
const SMALL_MODE_WIDTH = 67 // px
const TAB_SPACING = -1 // px

// globals
// =

var tabsContainerEl

// tab-width and max showable is adjusted based on window width and # of tabs
var currentTabWidth = MAX_TAB_WIDTH
var numPinnedTabs = 0
var numTabsWeCanFit = Infinity // we start out fairly optimistic

// exported methods
// ==

export function setup () {
  // render
  tabsContainerEl = yo`<div class="chrome-tabs drop-zone" ondrop=${onDrop}>
    <div class="chrome-tab chrome-tab-add-btn drop-zone" onclick=${onClickNew} title="Open new tab">
      <div class="chrome-tab-bg drop-zone"></div>
      <span class="plus drop-zone">+</span>
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
  if (page.isLoading() && page.getIntendedURL() !== pages.DEFAULT_URL) {
    // loading spinner
    favicon = yo`<div class="spinner"></div>`
    if (!page.isReceivingAssets) { favicon.classList.add('reverse') }
  } else {
    // page's explicit favicon
    if (page.favicons && page.favicons[0]) {
      favicon = yo`<img src=${page.favicons[page.favicons.length - 1]}>`
      favicon.onerror = onFaviconError(page)
    } else if (page.getURL().startsWith('beaker:')) {
      // favicon = yo`<img src="beaker-favicon:beaker">`
      favicon = getBuiltinPageIcon(page.getURL())
    } else {
      // (check for cached icon)
      favicon = yo`<img src="beaker-favicon:${page.getURL()}?cache=${Date.now()}">`
    }
  }

  // class
  var cls = ''
  if (isActive) cls += ' chrome-tab-current'
  if (isTabDragging) cls += ' chrome-tab-dragging'

  // styles
  var {pageIndex, style, smallMode} = getPageStyle(page)
  if (smallMode) cls += ' chrome-tab-small'

  // pinned rendering:
  if (page.isPinned) {
    return yo`<div class=${'chrome-tab chrome-tab-pinned drop-zone' + cls}
                data-id=${page.id}
                style=${style}
                onclick=${onClickTab(page)}
                oncontextmenu=${onContextMenuTab(page)}
                onmousedown=${onMouseDown(page)}
                title=${getNiceTitle(page)}>
      <div class="chrome-tab-bg"></div>
      <div class="chrome-tab-favicon">${favicon}</div>
    </div>`
  }

  // normal rendering:

  return yo`
  <div class=${'chrome-tab' + cls}
      data-id=${page.id}
      style=${style}
      onclick=${onClickTab(page)}
      oncontextmenu=${onContextMenuTab(page)}
      onmousedown=${onMouseDown(page)}
      ondrop=${onTabDrop(page)}
      title=${getNiceTitle(page)}>
    <div class="chrome-tab-bg"></div>
    <div class="chrome-tab-favicon">${favicon}</div>
    <div class="chrome-tab-title">${getNiceTitle(page) || 'New Tab'}</div>
    <div class="chrome-tab-close" title="Close tab" onclick=${onClickTabClose(page)}></div>
  </div>`
}

// calculate and position all tabs
// - should be called any time the # of pages changes, or pin/unpin
function repositionTabs (e) {
  const allPages = pages.getAll()

  // compute tab width for the space we have
  // - we need to distributed the space among unpinned tabs
  numPinnedTabs = 0
  var numUnpinnedTabs = 0
  var availableWidth = window.innerWidth
  // correct for traffic lights
  if (getPlatform() === 'darwin' && !document.body.classList.contains('fullscreen')) { availableWidth -= 80 }
  if (getPlatform() === 'win32') { availableWidth -= 200 }
  // correct for new-tab and dropdown btns
  availableWidth -= (MIN_TAB_WIDTH + TAB_SPACING)
  // count the unpinned-tabs, and correct for the spacing and pinned-tabs
  allPages.forEach(p => {
    availableWidth -= TAB_SPACING
    if (p.isPinned) {
      numPinnedTabs++
      availableWidth -= MIN_TAB_WIDTH
    }
    else numUnpinnedTabs++
  })
  // check if we're out of space
  numTabsWeCanFit = Math.min(Math.floor(availableWidth / SMALL_MODE_WIDTH), numUnpinnedTabs)
  if (numTabsWeCanFit < numUnpinnedTabs) {
    // TODO we should provide a control to access the additional tabs
    numUnpinnedTabs = numTabsWeCanFit
  }
  // now calculate a (clamped) size
  currentTabWidth = Math.min(MAX_TAB_WIDTH, Math.max(MIN_TAB_WIDTH, availableWidth / numUnpinnedTabs)) | 0

  // update tab positions
  allPages.forEach(page => getTabEl(page, tabEl => {
    var {style, pageIndex, smallMode} = getPageStyle(page)
    tabEl.classList.toggle('chrome-tab-small', smallMode)
    tabEl.style = style
  }))
  tabsContainerEl.querySelector('.chrome-tab-add-btn').style = getAddBtnStyle()
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
    if (oldTabEl) {
      oldTabEl.classList.remove('chrome-tab-current')
    }

    // set new tab active
    newTabEl.classList.add('chrome-tab-current')

    // recalculate tab styles
    repositionTabs()
  })
}

// ui events
// =

function onClickNew () {
  var page = pages.create()
  pages.setActive(page)
  navbar.focusLocation(page)
}

function onDrop (event) {
  var link = event.dataTransfer.getData('URL')
  var isNotOnTab = !event.target.classList.contains('chrome-tab')
    && !event.target.classList.contains('chrome-tab-title')
  var isOnNewTabBtn = event.target.classList.contains('')

  if (link && (isNotOnTab || isOnNewTabBtn)) {
    var page = pages.create({
      url: link
    })
    pages.setActive(page)
    navbar.updateLocation(page)
  }
}

function onClickDuplicate (page) {
  return () => pages.create(page.getURL())
}

function onClickPin (page) {
  return () => pages.togglePinned(page)
}

function onToggleMuted (page) {
  return () => {
    if (page.webviewEl) {
      const wc = page.webviewEl.getWebContents()
      const isMuted = wc.isAudioMuted()
      wc.setAudioMuted(!isMuted)
    }
  }
}

function onTabDrop (page) {
  return (event) => {
    var link = event.dataTransfer.getData('text/uri-list')

    if (link) {
      page.url = link
      page.loadURL(link)
      pages.setActive(page)
      navbar.updateLocation(page)
    }
  }
}

function onClickTab (page) {
  return e => {
    if (e.which !== 2) {
      pages.setActive(page)
    }
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
  return async () => {
    pages.setActive(page)
    var ps = pages.getAll().slice()
    for (var i = 0; i < ps.length; i++) {
      if (ps[i] != page) {
        await pages.remove(ps[i])
      }
    }
  }
}

function onClickCloseTabsToTheRight (page) {
  return async () => {
    var ps = pages.getAll()
    var index = ps.indexOf(page)
    for (var i = ps.length - 1; i > index; i--) {
      await pages.remove(ps[i])
    }
  }
}

function onClickReopenClosedTab () {
  pages.reopenLastRemoved()
}

function onContextMenuTab (page) {
  return e => {
    const { Menu } = remote
    var isMuted = false
    if (page.webviewEl) {
      isMuted = page.webviewEl.getWebContents().isAudioMuted()
    }
    var menu = Menu.buildFromTemplate([
      { label: 'New Tab', click: onClickNew },
      { type: 'separator' },
      { label: 'Duplicate', click: onClickDuplicate(page) },
      { label: (page.isPinned) ? 'Unpin Tab' : 'Pin Tab', click: onClickPin(page) },
      { label: (isMuted) ? 'Unmute Tab' : 'Mute Tab', click: onToggleMuted(page) },
      { type: 'separator' },
      { label: 'Close Tab', click: onClickTabClose(page) },
      { label: 'Close Other Tabs', click: onClickCloseOtherTabs(page) },
      { label: 'Close Tabs to the Right', click: onClickCloseTabsToTheRight(page) },
      { type: 'separator' },
      { label: 'Reopen Closed Tab', click: onClickReopenClosedTab }
    ])
    menu.popup(remote.getCurrentWindow())
  }
}

function onMouseDown (page) {
  return e => {
    // middle click
    if (e.which === 2) {
      pages.remove(page)
      return
    }

    // left click
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
    window.addEventListener('blur', dragend, true)

    // throttle so we only rerender as much as needed
    // - actually throttling seems to cause jank
    var rerender = /* throttle( */() => {
      repositionTabs()
    }/*, 30) */

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
  for (var i = 0; i < pageIndex; i++) { x += getTabWidth(allPages[i]) + TAB_SPACING }

  // add the page offset
  if (allPages[pageIndex]) { x += allPages[pageIndex].tabDragOffset }

  // done
  return x
}

function getTabWidth (page) {
  if (page.isPinned) { return MIN_TAB_WIDTH }
  return currentTabWidth
}

function getPageStyle (page) {
  const allPages = pages.getAll()

  // `page` is sometimes an index and sometimes a page object (gross, I know)
  // we need both
  var pageIndex
  var pageObject
  var smallMode = false
  if (typeof page === 'object') {
    pageObject = page
    pageIndex = allPages.indexOf(page)
  } else {
    pageObject = allPages[page]
    pageIndex = page
  }

  // z-index
  var zIndex = pageIndex + 1 // default to the order across
  if (!pageObject) {
    zIndex = 0
  } else if (pageObject.isActive) {
    zIndex = 999 // top
  } else if (pageObject.isTabDragging) {
    zIndex = 998 // almost top
  }

  var style = `
    transform: translateX(${getTabX(pageIndex)}px);
    z-index: ${zIndex};
  `
  if (pageObject) {
    let width = getTabWidth(pageObject)
    style += ` width: ${width}px;`
    if (width < SMALL_MODE_WIDTH) {
      smallMode = true
    }
  }
  if (pageIndex >= numPinnedTabs + numTabsWeCanFit) {
    style += ' display: none;'
  }
  return {pageIndex, smallMode, style}
}

function getAddBtnStyle () {
  return `
    transform: translateX(${getTabX(numPinnedTabs + numTabsWeCanFit)}px);
    z-index: 0;
  `
}

// returns 0 for no, -1 or 1 for yes (the offset)
function shouldReorderTab (page) {
  // has the tab been dragged far enough to change order?
  if (!page.isTabDragging) { return 0 }

  var limit = (page.isPinned ? 40 : getTabWidth(page)) / 2
  if (page.tabDragOffset < -1 * limit) { return -1 }
  if (page.tabDragOffset > limit) { return 1 }
  return 0
}

function getNiceTitle (page) {
  const title = page.getTitle()
  if (!title) return false

  // if the title is just the URL, give the path
  if (title !== page.getURL()) {
    return title
  }
  try {
    let { pathname, origin } = new URL(title)
    if (!pathname.endsWith('/')) {
      pathname = pathname.split('/').pop()
      return `${pathname} - ${origin}`
    }
    return origin
  } catch (e) {
    return title
  }
}

var _platform
function getPlatform () {
  if (!_platform) _platform = beaker.browser.getInfo().platform
  return _platform
}

function getBuiltinPageIcon (url) {
  if (url.startsWith('beaker://library/dat://')) {
    // use the protocol, it will try to load the favicon of the dat
    return yo`<img src="beaker-favicon:${url}?cache=${Date.now()}">`
  }
  if (url.startsWith('beaker://library/')) {
    return yo`<i class="fa fa-book"></i>`
  }
  if (url.startsWith('beaker://bookmarks/')) {
    return yo`<i class="fa fa-star-o"></i>`
  }
  if (url.startsWith('beaker://history/')) {
    return yo`<i class="fa fa-history"></i>`
  }
  if (url.startsWith('beaker://downloads/')) {
    return yo`<i class="fa fa-download"></i>`
  }
  if (url.startsWith('beaker://settings/')) {
    return yo`<i class="fa fa-gear"></i>`
  }
  if (url.startsWith('beaker://swarm-debugger/')) {
    return yo`<i class="fa fa-bug"></i>`
  }
  if (url.startsWith('beaker://watchlist/')) {
    return yo`<i class="fa fa-eye"></i>`
  }
  return yo`<i class="fa fa-window-maximize"></i>`
}
