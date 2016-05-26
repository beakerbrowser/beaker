import * as webviews from '../webviews'

export function setup () {
  webviews.on('set-active', update)
  webviews.on('did-start-loading', updateIfActive)
  webviews.on('did-stop-loading', updateIfActive)
}

// update functions
// =

function update () {
  var wv = webviews.getActive()
  if ('getURL' in wv) {
    var addrEl = document.querySelector('#toolbar-nav input')
    addrEl.value = (wv.dataset.isReady) ? wv.getURL() : ''
  }
}

function updateIfActive (e) {
  if (e.target.dataset.isActive)
    update(e)
}