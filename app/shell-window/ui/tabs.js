import * as pages from '../pages'

export function setup () {
  pages.on('update', updateTabs)
  pages.on('set-active', updateTabs)
  pages.on('did-start-loading', updateTab)
  pages.on('did-stop-loading', updateTab)
  pages.on('page-title-updated', updateTab)
}

// update functions
// =

function updateTabs () {
  document.getElementById('toolbar-tabs').innerHTML = `
    ${pages.getAll().map(drawTab).join('')}
    <div class="tab-item tab-item-fixed" onclick="javascript:tabsEvents.onClickNew(event)">
      <span class="icon icon-plus"></span>
    </div>
  `  
}

function updateTab (e) {
  var page = pages.getByWebview(e.target)
  document.querySelector('#toolbar-tabs .tab-item[data-id="'+page.id+'"]').innerHTML = drawTabInner(page)
}

// render functions
// =

function drawTab (page) {
  var isActive = page.isActive
  return `<div class="tab-item${isActive ? ' active':''}" data-id="${page.id}" onclick="javascript:tabsEvents.onClickTab(event)">
    ${drawTabInner(page)}
  </div>`
}

function drawTabInner (page) {
  // TODO loading icon
  const loadingHtml = page.isLoading() ? '<strong>loading... </strong>' : ''
  return `
    <span class="icon icon-cancel icon-close-tab" onclick="javascript:tabsEvents.onClickTabClose(event)"></span>
    <span class="tab-text">${loadingHtml}${page.getTitle() || 'New tab'}</span>
  `
}

// webview eventhandlers
// =

function onDidStartLoading (e) {
  // TODO
}

// ui event handlers
// =

window.tabsEvents = {
  onClickNew: function () {
    var page = pages.create()
    pages.setActive(page)
  },
  onClickTab: function (e) {
    var page = pages.getById(e.target.dataset.id)
    if (page)
      pages.setActive(page)
  },
  onClickTabClose: function (e) {
    var page = pages.getById(e.target.parentNode.dataset.id)
    if (page)
      pages.remove(page)
  }
}