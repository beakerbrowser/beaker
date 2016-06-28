import { remote } from 'electron'
import * as pages from '../pages'
import * as history from '../../lib/fg/history-api'
import * as url from 'url'
import * as path from 'path'
import * as yo from 'yo-yo'

const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/1bzALt_JzmM_N8B3aK29epE7_VIyZMe0QsCXh3LqPY2I/viewform'
const KEYCODE_DOWN = 40
const KEYCODE_UP = 38
const KEYCODE_ESC = 27
const KEYCODE_ENTER = 13

// globals
// =

var toolbarNavDiv = document.getElementById('toolbar-nav')

// autocomplete data
var autocompleteCurrentValue = null
var autocompleteCurrentSelection = 0
var autocompleteResults = null // if set to an array, will render dropdown

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

export function clearAutocomplete () {
  if (autocompleteResults) {
    autocompleteCurrentValue = null
    autocompleteCurrentSelection = 0
    autocompleteResults = null
    update()
  }
}

export function update (page) {
  // fetch current page, if not given
  page = page || pages.getActive()

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
    ? yo`<button class="toolbar-btn nav-cancel-btn" onclick=${onClickCancel}>
        <span class="icon icon-cancel"></span>
      </button>`
    : yo`<button class="toolbar-btn nav-reload-btn" onclick=${onClickReload}>
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
            class="nav-find-input"
            placeholder="Find in page..."
            oninput=${onInputFind}
            onkeydown=${onKeydownFind} />`
    : ''

  // bookmark btn should be disabled if on a beaker: protocol page
  var bookmarkClass = 'nav-bookmark-btn'+((page && !!page.bookmark) ? ' gold' : '')

  // zoom btn should only show if zoom is not the default setting
  var zoomBtn = ''
  if (page && page.zoom != 0) {
    // I dont know what that formula is, so I solved this problem like any good programmer would, by stealing the values from chrome
    var zoomPct = ({
      '-0.5': 90, '-1': 75, '-1.5': 67, '-2': 50, '-2.5': 33, '-3': 25,
      '0': 100,
      '0.5': 110, '1': 125, '1.5': 150, '2': 175, '2.5': 200, '3': 250, '3.5': 300, '4': 400, '4.5': 500
    })[page.zoom]
    zoomBtn = yo`<button onclick=${onClickZoom}><span class="icon icon-search"></span> <small>${zoomPct}%</small></button>`
  }

  // autocomplete dropdown
  var autocompleteDropdown = ''
  if (autocompleteResults) {
    autocompleteDropdown = yo`
      <div class="autocomplete-dropdown" onclick=${onClickAutocompleteDropdown}>
        ${autocompleteResults.map((r, i) => {
          // content type
          var iconCls = 'icon icon-' + ((r.search) ? 'search' : 'window')
          var contentColumn = (r.search)
            ? yo`<span class="result-search">${r.search}</span>`
            : yo`<span class="result-url">${r.url}</span>`
          
          // selection
          var rowCls = 'result'
          if (i == autocompleteCurrentSelection)
            rowCls += ' selected'

          // result row
          return yo`<div class=${rowCls} data-result-index=${i}>
            <span class=${iconCls}></span>
            ${contentColumn}
            <span class="result-title">${r.title}</span>
          </div>`
        })}
      </div>
    `
  }

  return yo`<div data-id=${id} class="toolbar-actions${toolbarHidden}">
    <div class="toolbar-group">
      <button class="toolbar-btn nav-back-btn" ${backDisabled} onclick=${onClickBack}>
        <span class="icon icon-left"></span>
      </button>
      <button class="toolbar-btn nav-forward-btn" ${forwardDisabled} onclick=${onClickForward}>
        <span class="icon icon-right"></span>
      </button>
      ${reloadBtn}      
    </div>
    <div class="toolbar-input-group">
      <input
        type="text"
        class="nav-location-input"
        onfocus=${onFocusLocation}
        onblur=${onBlurLocation}
        onkeyup=${onKeyupLocation}
        onkeydown=${onKeydownLocation} />
      ${inpageFinder}
      ${zoomBtn}
      <button class=${bookmarkClass} onclick=${onClickBookmark}><span class="icon icon-star"></span></button>
      ${autocompleteDropdown}
    </div>
    <div class="toolbar-group">
      <button class="toolbar-btn" onclick=${onClickFeedback} title="Send feedback"><span class="icon icon-megaphone"></span></button>
    </div>
  </div>`
}

function handleAutocompleteSearch (err, results) {
  var v = autocompleteCurrentValue
  if (err)
    console.warn('Autocomplete search failed', err)

  // does the value look like a url?
  var isProbablyUrl = (!v.includes(' ') && (/\.[A-z]/.test(v) || v.includes('://')))
  var vWithProtocol = v
  if (isProbablyUrl && !v.includes('://'))
    vWithProtocol = 'https://'+v

  // set the top results accordingly
  var gotoResult = { url: vWithProtocol, title: 'Go to '+v }
  var searchResult = { 
    search: v,
    title: 'DuckDuckGo Search',
    url: 'https://duckduckgo.com/?q=' + v.split(' ').join('+')
  }
  if (isProbablyUrl) autocompleteResults = [gotoResult, searchResult]
  else               autocompleteResults = [searchResult]

  // add search results
  if (results)
    autocompleteResults = autocompleteResults.concat(results)

  // render
  update()
}

function getAutocompleteSelectionUrl (i) {
  if (typeof i !== 'number')
    i = autocompleteCurrentSelection
  if (autocompleteResults && autocompleteResults[i])
    return autocompleteResults[i].url

  // fallback to the current value in the navbar
  var addrEl = pages.getActive().navbarEl.querySelector('.nav-location-input')
  return addrEl.value
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

function onClickBookmark (e) {
  var page = getEventPage(e)
  if (page)
    page.toggleBookmark()
}

function onClickZoom (e) {
  const { Menu, MenuItem } = remote
  const command = (c) => () => pages.getActive().send('command', c)
  var menu = Menu.buildFromTemplate([
    { label: 'Reset Zoom', click: command('view:zoom-reset') },
    { label: 'Zoom In', click: command('view:zoom-in') },
    { label: 'Zoom Out', click: command('view:zoom-out') },
  ])
  menu.popup(remote.getCurrentWindow())
}

function onClickFeedback (e) {
  pages.setActive(pages.create(FEEDBACK_FORM_URL))
}

function onFocusLocation (e) {
  var page = getEventPage(e)
  if (page)
    page.navbarEl.querySelector('.nav-location-input').select()
}

function onBlurLocation () {
  // HACK
  // blur gets called right before the click event for onClickAutocompleteDropdown
  // so, wait a bit before clearing the autocomplete, so the click has a chance to fire
  // -prf
  setTimeout(clearAutocomplete, 150)
}

function onKeyupLocation (e) {
  var value = e.target.value

  // on enter
  if (e.keyCode == KEYCODE_ENTER) {
    e.preventDefault()

    var page = getEventPage(e)
    if (page) {
      page.loadURL(getAutocompleteSelectionUrl())
      e.target.blur()
    }
    return
  }

  // on escape
  if (e.keyCode == KEYCODE_ESC) {
    e.target.blur()

    // reset the URL if there is one
    var page = getEventPage(e)
    var addrEl = page.navbarEl.querySelector('.nav-location-input')
    if (page && page.getIntendedURL())
      addrEl.value = page.getIntendedURL()
    return
  }

  // run autocomplete
  // TODO debounce
  var autocompleteValue = value.trim()
  if (autocompleteValue && autocompleteCurrentValue != autocompleteValue) {
    autocompleteCurrentValue = autocompleteValue
    history.search(value, handleAutocompleteSearch)
  } else if (!autocompleteValue)
    clearAutocomplete()
}

function onKeydownLocation (e) {
  // on keycode navigations
  if (autocompleteResults && (e.keyCode == KEYCODE_UP || e.keyCode == KEYCODE_DOWN)) {
    e.preventDefault()
    if (e.keyCode == KEYCODE_UP && autocompleteCurrentSelection > 0)
      autocompleteCurrentSelection--
    if (e.keyCode == KEYCODE_DOWN && autocompleteCurrentSelection < autocompleteResults.length - 1)
      autocompleteCurrentSelection++
    update()
    return
  }
}

function onClickAutocompleteDropdown (e) {
  // get the result index
  for (var i=0; i < e.path.length; i++) {
    if (e.path[i].dataset && e.path[i].classList.contains('result')) {
      // follow result url
      var resultIndex = +e.path[i].dataset.resultIndex
      pages.getActive().loadURL(getAutocompleteSelectionUrl(resultIndex))
      return
    }
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
  if (e.keyCode == KEYCODE_ESC) {
    var page = getEventPage(e)
    if (page)
      hideInpageFind(page)
  }

  // on enter
  if (e.keyCode == KEYCODE_ENTER) {
    var str = e.target.value
    var backwards = e.shiftKey // search backwords on shift+enter
    var page = getEventPage(e)
    if (page) {
      if (str) page.findInPage(str, { findNext: true, forward: !backwards })
      else     page.stopFindInPage('clearSelection')
    }
  }
}