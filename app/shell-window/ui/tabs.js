import * as webviews from '../webviews'

export function setup () {
  webviews.on('update', updateTabs)
  webviews.on('set-active', updateTabs)
  webviews.on('page-title-updated', updateTab)
}

// update functions
// =

function updateTabs () {
  document.getElementById('toolbar-tabs').innerHTML = `
    ${webviews.getAll().map(drawTab).join('')}
    <div class="tab-item tab-item-fixed">
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
  return `<div class="tab-item${isActive ? ' active':''}" data-id="${wv.dataset.id}" onclick="javascript:tabsEvents.onClick(event)">
    ${drawTabInner(wv)}
  </div>`
}

function drawTabInner (wv) {
  return `
    <span class="icon icon-cancel icon-close-tab"></span>
    ${('getTitle' in wv) ? wv.getTitle() : 'New tab'}
  `
}

// ui event handlers
// =

window.tabsEvents = {
  onClick: function (e) {
    var wv = webviews.getById(e.target.dataset.id)
    if (wv)
      webviews.setActive(wv)
  }
}