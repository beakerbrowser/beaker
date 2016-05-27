import * as webviews from '../webviews'

export function setup () {
  // render (only need to render once)
  document.getElementById('toolbar-nav').innerHTML = `
    <div class="btn-group">
      <button id="nav-back-btn" class="btn btn-default" onclick="javascript:navbarEvents.onClickBack(event)">
        <span class="icon icon-left-bold"></span>
      </button>
      <button id="nav-forward-btn" class="btn btn-default" onclick="javascript:navbarEvents.onClickForward(event)">
        <span class="icon icon-right-bold"></span>
      </button>
      <button id="nav-reload-btn" class="btn btn-default" onclick="javascript:navbarEvents.onClickReload(event)">
        <span class="icon icon-arrows-ccw"></span>
      </button>
      <button id="nav-cancel-btn" class="btn btn-default hidden" onclick="javascript:navbarEvents.onClickCancel(event)">
        <span class="icon icon-cancel"></span>
      </button>
    </div>
    <input id="nav-location-input" type="text" class="form-control">
  `

  // register events
  webviews.on('set-active', update)
  webviews.on('did-start-loading', updateIfActive)
  webviews.on('did-stop-loading', updateIfActive)
}

// update functions
// =

function update () {
  var wv = webviews.getActive()
  if (wv && wv.dataset.isReady) {
    // update location
    var addrEl = document.querySelector('#nav-location-input')
    addrEl.value = wv.getURL()

    setBtnEnabled('#nav-back-btn', wv.canGoBack())
    setBtnEnabled('#nav-forward-btn', wv.canGoForward())
    setBtnVisible('#nav-reload-btn', !wv.isLoading())
    setBtnVisible('#nav-cancel-btn', wv.isLoading())
  }
}

function updateIfActive (e) {
  if (e.target.dataset.isActive)
    update(e)
}

// internal helpers
// =

function setBtnEnabled (sel, b) {
  if (b)
    document.querySelector(sel).classList.remove('btn-disabled')
  else
    document.querySelector(sel).classList.add('btn-disabled')
}

function setBtnVisible (sel, b) {
  if (b)
    document.querySelector(sel).classList.remove('hidden')
  else
    document.querySelector(sel).classList.add('hidden')
}

// ui event handlers
// =

window.navbarEvents = {
  onClickBack: function () {
    var wv = webviews.getActive()
    if (wv && wv.dataset.isReady && wv.canGoBack())
      wv.goBack()
  },
  onClickForward: function () {
    var wv = webviews.getActive()
    if (wv && wv.dataset.isReady && wv.canGoForward())
      wv.goForward()
  },
  onClickReload: function () {
    var wv = webviews.getActive()
    if (wv && wv.dataset.isReady)
      wv.reload()
  },
  onClickCancel: function () {
    var wv = webviews.getActive()
    if (wv && wv.dataset.isReady)
      wv.stop()
  }
}