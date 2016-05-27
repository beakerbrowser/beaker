import * as webviews from '../webviews'

export function setup () {
  webviews.on('update', updateTabs)
  webviews.on('set-active', updateTabs)
  webviews.on('dom-ready', updateTab)
  webviews.on('page-title-updated', updateTab)
}

// update functions
// =

function updateTabs () {
  document.getElementById('toolbar-tabs').innerHTML = `
    ${webviews.getAll().map(drawTab).join('')}
    <div class="tab-item tab-item-fixed" onclick="javascript:tabsEvents.onClickNew(event)">
      <span class="icon icon-plus"></span>
    </div>
  `  
}

function updateTab (e) {
  var wv = e.target
  document.querySelector('#toolbar-tabs .tab-item[data-id="'+wv.dataset.id+'"]').innerHTML = drawTabInner(wv)
}

// render functions
// =

function drawTab (wv) {
  var isActive = wv.dataset.isActive
  return `<div class="tab-item${isActive ? ' active':''}" data-id="${wv.dataset.id}" onclick="javascript:tabsEvents.onClickTab(event)">
    ${drawTabInner(wv)}
  </div>`
}

function drawTabInner (wv) {
  return `
    <span class="icon icon-cancel icon-close-tab" onclick="javascript:tabsEvents.onClickTabClose(event)"></span>
    <span class="tab-text">${wv.dataset.isReady ? wv.getTitle() : 'New tab'}</span>
  `
}

// ui event handlers
// =

window.tabsEvents = {
  onClickNew: function () {
    var wv = webviews.create()
    webviews.setActive(wv)
  },
  onClickTab: function (e) {
    var wv = webviews.getById(e.target.dataset.id)
    if (wv)
      webviews.setActive(wv)
  },
  onClickTabClose: function (e) {
    var wv = webviews.getById(e.target.parentNode.dataset.id)
    if (wv)
      webviews.remove(wv)
  }
}