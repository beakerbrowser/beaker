import * as pages from '../pages'
import * as url from 'url'
import * as path from 'path'
import * as tld from 'tld'
// tld.defaultFile = path.join(__dirname, '../tlds.dat')

// globals
// =

var toolbarNavDiv = document.getElementById('toolbar-nav')

// exported functions
// =

export function createEl (id) {
  // render (only need to render once)
  var el = document.createElement('div')
  el.dataset.id = id
  el.classList.add('toolbar-actions')
  el.classList.add('hidden')
  el.innerHTML = `
    <div class="btn-group">
      <button class="nav-back-btn btn btn-default" onclick="javascript:navbarEvents.onClickBack(event)">
        <span class="icon icon-left-bold"></span>
      </button>
      <button class="nav-forward-btn btn btn-default" onclick="javascript:navbarEvents.onClickForward(event)">
        <span class="icon icon-right-bold"></span>
      </button>
      <button class="nav-reload-btn btn btn-default" onclick="javascript:navbarEvents.onClickReload(event)">
        <span class="icon icon-arrows-ccw"></span>
      </button>
      <button class="nav-cancel-btn btn btn-default hidden" onclick="javascript:navbarEvents.onClickCancel(event)">
        <span class="icon icon-cancel"></span>
      </button>
    </div>
    <input
      type="text"
      class="form-control nav-location-input "
      onfocus="javascript:navbarEvents.onFocusLocation(event)"
      onkeydown="javascript:navbarEvents.onKeydownLocation(event)">
    <input
      type="text"
      class="form-control nav-find-input hidden"
      placeholder="Find in page..."
      oninput="javascript:navbarEvents.onInputFind(event)"
      onkeydown="javascript:navbarEvents.onKeydownFind(event)">
  `
  toolbarNavDiv.appendChild(el)
  return el
}

export function focusLocation (page) {
  var el = page.navbarEl.querySelector('.nav-location-input')
  el.focus()
}

export function showInpageFind (page) {
  // show control and highlight text
  var el = page.navbarEl.querySelector('.nav-find-input')
  el.classList.remove('hidden')
  el.focus()
  el.select()

  // init search if there's a value leftover
  if (el.value)
    page.findInPage(el.value)
}

export function hideInpageFind (page) {
  setVisible(page, '.nav-find-input', false)
  page.stopFindInPage('clearSelection')
}

export function update (page) {
  // update location
  var addrEl = page.navbarEl.querySelector('.nav-location-input')
  if (!addrEl.matches(':focus') || !addrEl.value) // only update if not focused, so we dont mess up what the user is doing
    addrEl.value = page.getIntendedURL()

  setBtnEnabled(page, '.nav-back-btn', page.canGoBack())
  setBtnEnabled(page, '.nav-forward-btn', page.canGoForward())
  setVisible(page, '.nav-reload-btn', !page.isLoading())
  setVisible(page, '.nav-cancel-btn', page.isLoading())
}

// internal helpers
// =

function setBtnEnabled (page, sel, b) {
  if (b)
    page.navbarEl.querySelector(sel).classList.remove('btn-disabled')
  else
    page.navbarEl.querySelector(sel).classList.add('btn-disabled')
}

function setVisible (page, sel, b) {
  if (b)
    page.navbarEl.querySelector(sel).classList.remove('hidden')
  else
    page.navbarEl.querySelector(sel).classList.add('hidden')
}

// thanks ogd (from tabby)
function toGoodUrl (href, cb) {
  var original = href

  // if there's a space in the URL, assume it's a search
  if (href.indexOf(' ') > -1)
    return search(href)

  // if there's a protocol, assume it's a link
  var parsed = url.parse(href)
  if (parsed.protocol)
    return cb(href)

  // localhost always goes
  if (parsed.hostname == 'localhost')
    return cb(href)

  // default protocol to https
  href = 'https://' + href
  parsed = url.parse(href)

  // check against tdls.dat
  var validTld = tld.registered(parsed.hostname)
  if (validTld && href.indexOf('.') > -1)
    return cb(href)

  // ok, so there doesnt *appear* to be a good TLD in the hostname
  // but, the device may have hostnames in /etc/hosts without TLDs
  // simple solution: try a dns lookup, and abort in 250ms
  // if there's an /etc/hosts entry, the DNS lookup should succeed before 250ms passes
  var queryFinished = false
  setTimeout(function () {
    if (queryFinished) return
    queryFinished = true
    search(original)
  }, 250)

  dns.lookup(parsed.hostname, function (err, address) {
    if (queryFinished) return
    queryFinished = true
    if (err) return search(original)
    else cb(href)
  })

  function search (href) {
    cb('https://duckduckgo.com/?q=' + href.split(' ').join('+'))
  }
}

// ui event handlers
// =

function getEventPage (e) {
  for (var i=0; i < e.path.length; i++)
    if (e.path[i].dataset && e.path[i].dataset.id)
      return pages.getById(e.path[i].dataset.id)
}
window.navbarEvents = {
  onClickBack: function (e) {
    var page = getEventPage(e)
    if (page && page.canGoBack())
      page.goBack()
  },
  onClickForward: function (e) {
    var page = getEventPage(e)
    if (page && page.canGoForward())
      page.goForward()
  },
  onClickReload: function (e) {
    var page = getEventPage(e)
    if (page)
      page.reload()
  },
  onClickCancel: function (e) {
    var page = getEventPage(e)
    if (page)
      page.stop()
  },
  onFocusLocation: function (e) {
    var page = getEventPage(e)
    if (page)
      page.navbarEl.querySelector('.nav-location-input').select()
  },
  onKeydownLocation: function (e) {
    // on enter
    if (e.keyCode == 13) {
      e.preventDefault()
      var url = e.target.value

      var page = getEventPage(e)
      if (page) {
        e.target.blur()
        toGoodUrl(url, url => page.loadURL(url))
      }
    }

    // on escape
    if (e.keyCode == 27) {
      e.target.blur()

      // reset the URL if there is one
      var page = getEventPage(e)
      var addrEl = page.navbarEl.querySelector('.nav-location-input')
      if (page && page.getIntendedURL())
        addrEl.value = page.getIntendedURL()
    }
  },
  onInputFind: function (e) {
    var str = e.target.value
    var page = getEventPage(e)
    if (page) {
      if (str) page.findInPage(str)
      else     page.stopFindInPage('clearSelection')
    }
  },
  onKeydownFind: function (e) {
    // on escape
    if (e.keyCode == 27) {
      var page = getEventPage(e)
      if (page)
        hideInpageFind(page)
    }

    // on enter
    if (e.keyCode == 13) {
      var str = e.target.value
      var backwards = e.shiftKey // search backwords on shift+enter
      var page = getEventPage(e)
      if (page) {
        if (str) page.findInPage(str, { findNext: true, forward: !backwards })
        else     page.stopFindInPage('clearSelection')
      }
    }
  }
}