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
  yo.update(document.getElementById('toolbar-tabs'), yo`<div id="toolbar-tabs" class="tab-group">
    ${pages.getAll().map(drawTab)}
    <div class="tab-item tab-item-fixed" onclick=${onClickNew}>
      <span class="icon icon-plus"></span>
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

function drawTab (page) {
  const favicon = page.isLoading()
    ? yo`<span class="icon icon-hourglass"></span>`
    : (page.favicons && page.favicons[0])
      ? yo`<img src=${page.favicons[0]}>`
      : yo`<span class="icon icon-window"></span>`

  const isActive = page.isActive
  return yo`<div class=${'tab-item'+(isActive ? ' active':'')} data-id=${page.id} onclick=${onClickTab}>
    <span class="icon icon-cancel icon-close-tab" onclick=${onClickTabClose}></span>
    <span class="tab-text">${favicon} ${page.getTitle() || 'New tab'}</span>
  </div>`
}

// webview eventhandlers
// =

function onDidStartLoading (e) {
  // TODO
}

// ui event handlers
// =

function onClickNew () {
  var page = pages.create()
  pages.setActive(page)
}

function onClickTab (e) {
  var page = pages.getById(e.target.dataset.id)
  if (page)
    pages.setActive(page)
}

function onClickTabClose (e) {
  var page = pages.getById(e.target.parentNode.dataset.id)
  if (page)
    pages.remove(page)
}