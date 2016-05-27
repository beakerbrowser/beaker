import * as webviews from '../webviews'

// exported functions
// =

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
    <input id="nav-location-input"
      type="text"
      class="form-control"
      onfocus="javascript:navbarEvents.onFocusLocation(event)"
      onkeydown="javascript:navbarEvents.onKeydownLocation(event)">
    <input id="nav-find-input"
      type="text"
      class="form-control hidden"
      placeholder="Find in page..."
      oninput="javascript:navbarEvents.onInputFind(event)"
      onkeydown="javascript:navbarEvents.onKeydownFind(event)">
  `

  // register events
  webviews.on('set-active', update)
  webviews.on('did-start-loading', updateIfActive)
  webviews.on('did-stop-loading', updateIfActive)
  webviews.on('did-start-loading', hideInpageFind)
}

export function focusLocation () {
  document.querySelector('#nav-location-input').focus()
}

export function showInpageFind () {
  // show control and highlight text
  var el = document.querySelector('#nav-find-input')
  el.classList.remove('hidden')
  el.focus()
  el.select()

  if (el.value) {
    // init search if there's a value leftover
    var wv = webviews.getActive()
    if (wv && wv.dataset.isReady)
      wv.findInPage(el.value)
  }
}

export function hideInpageFind () {
  setVisible('#nav-find-input', false)
  
  var wv = webviews.getActive()
  if (wv && wv.dataset.isReady)
    wv.stopFindInPage('clearSelection')
}

// internal update functions
// =

function update () {
  var wv = webviews.getActive()
  if (wv && wv.dataset.isReady) {
    // update location
    var addrEl = document.querySelector('#nav-location-input')
    addrEl.value = wv.getURL()

    setBtnEnabled('#nav-back-btn', wv.canGoBack())
    setBtnEnabled('#nav-forward-btn', wv.canGoForward())
    setVisible('#nav-reload-btn', !wv.isLoading())
    setVisible('#nav-cancel-btn', wv.isLoading())
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

function setVisible (sel, b) {
  if (b)
    document.querySelector(sel).classList.remove('hidden')
  else
    document.querySelector(sel).classList.add('hidden')
}

function toGoodUrl (str) {
  // see if it works as-is
  try { return (new URL(str)).toString() }
  catch (e) {}

  // if it looks like a url, try adding https://
  if (str.indexOf('.') !== -1) {
    try { return (new URL('https://'+str)).toString() }
    catch (e) {}
  }

  // ok then, search for it
  return 'https://duckduckgo.com/?q='+encodeURIComponent(str)
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
  },
  onFocusLocation: function (e) {
    var el = document.getElementById('nav-location-input')
    el.select()
  },
  onKeydownLocation: function (e) {
    // on enter
    if (e.keyCode == 13) {
      e.preventDefault()
      var url = e.target.value

      var wv = webviews.getActive()
      if (wv && wv.dataset.isReady)
        wv.loadURL(toGoodUrl(url))
    }
  },
  onInputFind: function (e) {
    var str = e.target.value
    var wv = webviews.getActive()
    if (wv && wv.dataset.isReady) {
      if (str)
        wv.findInPage(str)
      else
        wv.stopFindInPage('clearSelection')
    }
  },
  onKeydownFind: function (e) {
    // on escape
    if (e.keyCode == 27)
      hideInpageFind()

    // on enter
    if (e.keyCode == 13) {
      var str = e.target.value
      var backwards = e.shiftKey // search backwords on shift+enter
      var wv = webviews.getActive()
      if (wv && wv.dataset.isReady) {
        if (str)
          wv.findInPage(str, { findNext: true, forward: !backwards })
        else
          wv.stopFindInPage('clearSelection')
      }
    }
  }
}