import * as pages from '../pages'
import * as url from 'url'
import * as path from 'path'
import * as tld from 'tld'
import * as yo from 'yo-yo'
import * as dns from 'dns'
// tld.defaultFile = path.join(__dirname, '../tlds.dat')

// globals
// =

var toolbarNavDiv = document.getElementById('toolbar-nav')

// exported functions
// =

export function createEl (id) {
  // render (only need to render once)
  var el = render(id, null)
  toolbarNavDiv.appendChild(el)
  return el
}

export function focusLocation (page) {
  var el = page.navbarEl.querySelector('.nav-location-input')
  el.focus()
}

export function showInpageFind (page) {
  // show control and highlight text
  page.isInpageFinding = true
  update(page)
  var el = page.navbarEl.querySelector('.nav-find-input')
  el.focus()
  el.select()

  // init search if there's a value leftover
  // FIXME
  // this behavior got lost in the switch over to using yo-yo
  // do we want it back?
  // -prf
  // if (el.value)
    // page.findInPage(el.value)
}

export function hideInpageFind (page) {
  page.stopFindInPage('clearSelection')
  page.isInpageFinding = false
  update(page)
}

export function update (page) {
  // update location
  var addrEl = page.navbarEl.querySelector('.nav-location-input')
  var isAddrElFocused = addrEl.matches(':focus')
  if (!isAddrElFocused || !addrEl.value) { // only update if not focused or empty, so we dont mess up what the user is doing
    addrEl.value = page.getIntendedURL()
    if (isAddrElFocused) // if was focused, then select what we put in
      addrEl.select()
  }

  // render
  yo.update(page.navbarEl, render(page.id, page))
}

// internal helpers
// =

function render (id, page) {
  var isLoading = page && page.isLoading()

  // back/forward should be disabled if its not possible go back/forward
  var backDisabled = (page && page.canGoBack()) ? '' : 'disabled'
  var forwardDisabled = (page && page.canGoForward()) ? '' : 'disabled'

  // render reload/cancel btn
  var reloadBtn = (isLoading)
    ? yo`<button class="nav-cancel-btn btn btn-default" onclick=${onClickCancel}>
        <span class="icon icon-cancel"></span>
      </button>`
    : yo`<button class="nav-reload-btn btn btn-default" onclick=${onClickReload}>
        <span class="icon icon-arrows-ccw"></span>
      </button>`

  // `page` is null on initial render
  // and the toolbar should be hidden on initial render
  // and it should be hidden if the page isnt active
  var toolbarHidden = (!page || !page.isActive) ? ' hidden' : ''

  // inpage finder ctrl
  var inpageFinder = (page && page.isInpageFinding)
    ? yo`<input
            type="text"
            class="form-control nav-find-input"
            placeholder="Find in page..."
            oninput=${onInputFind}
            onkeydown=${onKeydownFind} />`
    : ''

  // favorite btn should be disabled if on a beaker: protocol page
  var favoriteDisabled = (page && page.getURL().indexOf('beaker:') !== 0) ? '' : 'disabled'

  return yo`<div data-id=${id} class="toolbar-actions${toolbarHidden}">
    <div class="btn-group">
      <button class="nav-back-btn btn btn-default" ${backDisabled} onclick=${onClickBack}>
        <span class="icon icon-left-bold"></span>
      </button>
      <button class="nav-forward-btn btn btn-default" ${forwardDisabled} onclick=${onClickForward}>
        <span class="icon icon-right-bold"></span>
      </button>
      ${reloadBtn}      
    </div>
    <input
      type="text"
      class="form-control nav-location-input "
      onfocus=${onFocusLocation}
      onkeydown=${onKeydownLocation} />
    ${inpageFinder}
    <div>
      <button class="nav-favorite-btn btn btn-default" ${favoriteDisabled} onclick=${onClickFavorite}>
        <span class="icon icon-star-empty"></span>
      </button>
    </div>
  </div>`
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
  // FIXME
  // this got broken by changing to the beaker: protocol
  // __dirname isnt set correctly, so TLD cant load its dat file
  // -prf
  // var validTld = tld.registered(parsed.hostname)
  // if (validTld && href.indexOf('.') > -1)
    // return cb(href)

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

function onClickBack (e) {
  var page = getEventPage(e)
  if (page && page.canGoBack())
    page.goBack()
}

function onClickForward (e) {
  var page = getEventPage(e)
  if (page && page.canGoForward())
    page.goForward()
}

function onClickReload (e) {
  var page = getEventPage(e)
  if (page)
    page.reload()
}

function onClickCancel (e) {
  var page = getEventPage(e)
  if (page)
    page.stop()
}

function onClickFavorite (e) {

}

function onFocusLocation (e) {
  var page = getEventPage(e)
  if (page)
    page.navbarEl.querySelector('.nav-location-input').select()
}

function onKeydownLocation (e) {
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
}

function onInputFind (e) {
  var str = e.target.value
  var page = getEventPage(e)
  if (page) {
    if (str) page.findInPage(str)
    else     page.stopFindInPage('clearSelection')
  }
}

function onKeydownFind (e) {
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