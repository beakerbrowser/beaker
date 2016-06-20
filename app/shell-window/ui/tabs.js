import * as yo from 'yo-yo'
import * as pages from '../pages'

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
        <div class="chrome-tab-curves">
          <div class="chrome-tab-curves-left-shadow"></div>
          <div class="chrome-tab-curves-left-highlight"></div>
          <div class="chrome-tab-curves-left"></div>
          <div class="chrome-tab-curves-right-shadow"></div>
          <div class="chrome-tab-curves-right-highlight"></div>
          <div class="chrome-tab-curves-right"></div>
        </div>
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
  if (page.isLoading())
    favicon = yo`<span class="icon icon-hourglass"></span>`
  else {
    if (page.favicons && page.favicons[0]) {
      favicon = yo`<img src=${page.favicons[0]}>`
      favicon.onerror = onFaviconError(page)
    }
    else
      favicon = yo`<span class="icon icon-window"></span>`
  }

  const isActive = page.isActive
  return yo`<div class=${'chrome-tab'+(isActive?' chrome-tab-current':'')} data-id=${page.id} onclick=${onClickTab(page)}>
    <div class="chrome-tab-favicon">${favicon}</div>
    <div class="chrome-tab-title">${page.getTitle() || 'New tab'}</div>
    <div class="chrome-tab-close" onclick=${onClickTabClose(page)}></div>
    <div class="chrome-tab-curves">
      <div class="chrome-tab-curves-left-shadow"></div>
      <div class="chrome-tab-curves-left-highlight"></div>
      <div class="chrome-tab-curves-left"></div>
      <div class="chrome-tab-curves-right-shadow"></div>
      <div class="chrome-tab-curves-right-highlight"></div>
      <div class="chrome-tab-curves-right"></div>
    </div>
  </div>`
}

// ui event handlers
// =

function onClickNew () {
  var page = pages.create()
  pages.setActive(page)
}

function onClickTab (page) {
  return () => pages.setActive(page)
}

function onClickTabClose (page) {
  return e => {
    e.preventDefault()
    e.stopPropagation()
    pages.remove(page)
  }
}

function onFaviconError (page) {
  return () => {
    // if the favicon 404s, just fallback to the icon
    page.favicons = null
    updateTabs()
  }
}