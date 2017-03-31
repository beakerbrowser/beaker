import { remote } from 'electron'
import * as pages from '../pages'
import * as zoom from '../pages/zoom'
import * as yo from 'yo-yo'
import emitStream from 'emit-stream'
import prettyHash from 'pretty-hash'
import { UpdatesNavbarBtn } from './navbar/updates'
import { DropMenuNavbarBtn } from './navbar/drop-menu'
import { SiteInfoNavbarBtn } from './navbar/site-info'
import {pluralize} from '../../lib/strings'

const KEYCODE_DOWN = 40
const KEYCODE_UP = 38
const KEYCODE_ESC = 27
const KEYCODE_ENTER = 13
const KEYCODE_N = 78
const KEYCODE_P = 80

const isDatHashRegex = /^[a-z0-9]{64}/i

// globals
// =

var toolbarNavDiv = document.getElementById('toolbar-nav')
var updatesNavbarBtn = null
var dropMenuNavbarBtn = null
var siteInfoNavbarBtn = null

// autocomplete data
var autocompleteCurrentValue = null
var autocompleteCurrentSelection = 0
var autocompleteResults = null // if set to an array, will render dropdown

// exported functions
// =

export function setup () {
  // create the button managers
  updatesNavbarBtn = new UpdatesNavbarBtn()
  dropMenuNavbarBtn = new DropMenuNavbarBtn()
  siteInfoNavbarBtn = new SiteInfoNavbarBtn()
}

export function createEl (id) {
  // render
  var el = render(id, null)
  toolbarNavDiv.appendChild(el)
  return el
}

export function focusLocation (page) {
  var el = page.navbarEl.querySelector('.nav-location-input')
  el.classList.remove('hidden')
  el.focus()
  el.select()
}

export function isLocationFocused (page) {
  // fetch current page, if not given
  page = page || pages.getActive()

  // get element and pull state
  var addrEl = page.navbarEl.querySelector('.nav-location-input')
  return addrEl.matches(':focus')
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

  // render
  yo.update(page.navbarEl, render(page.id, page))
}

export function updateLocation (page) {
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
}

// internal helpers
// =

function render (id, page) {
  const isLoading = page && page.isLoading()
  const isViewingDat = page && page.getURL().startsWith('dat:')
  const siteHasDatAlternative = page && page.siteHasDatAlternative

  // back/forward should be disabled if its not possible go back/forward
  var backDisabled = (page && page.canGoBack()) ? '' : 'disabled'
  var forwardDisabled = (page && page.canGoForward()) ? '' : 'disabled'

  // render reload/cancel btn
  var reloadBtn = (isLoading)
    ? yo`
        <button class="toolbar-btn nav-cancel-btn" onclick=${onClickCancel}>
          <span class="fa fa-times"></span>
        </button>`
    : yo`
        <button class="toolbar-btn nav-reload-btn" onclick=${onClickReload} title="Reload this page">
          <span class="fa fa-refresh"></span>
        </button>`

  // `page` is null on initial render
  // and the toolbar should be hidden on initial render
  // and it should be hidden if the page isnt active
  var toolbarHidden = (!page || !page.isActive) ? ' hidden' : ''

  // preserve the current finder value and focus
  var findEl = page && page.navbarEl.querySelector('.nav-find-input')
  var findValue = findEl ? findEl.value : ''

  // inpage finder ctrl
  var inpageFinder = (page && page.isInpageFinding)
    ? yo`<input
            type="text"
            class="nav-find-input"
            placeholder="Find in page..."
            oninput=${onInputFind}
            onkeydown=${onKeydownFind}
            value=${findValue} />`
    : ''

  // bookmark toggle state
  var bookmarkBtnClass = 'nav-bookmark-btn' + ((page && !!page.bookmark) ? ' active' : '')

  // zoom btn should only show if zoom is not the default setting
  var zoomBtn = ''
  if (page && page.zoom != 0) {
    // I dont know what that formula is, so I solved this problem like any good programmer would, by stealing the values from chrome
    var zoomPct = ({
      '-0.5': 90, '-1': 75, '-1.5': 67, '-2': 50, '-2.5': 33, '-3': 25,
      '0': 100,
      '0.5': 110, '1': 125, '1.5': 150, '2': 175, '2.5': 200, '3': 250, '3.5': 300, '4': 400, '4.5': 500
    })[page.zoom]
    var zoomIcon = zoomPct < 100 ? '-minus' : '-plus'
    zoomBtn = yo`
      <button onclick=${onClickZoom} title="Zoom: ${zoomPct}%" class="zoom">
        <i class=${'fa fa-search' + zoomIcon}></i>
        ${zoomPct}%
      </button>`
  }

  // dat buttons
  var datBtns = ''
  var toolbarActionDatBtns = ''
  var toolbarActionDat = ''

  if (isViewingDat) {
    let forkBtnTitle = 'Fork (Duplicate) This Site'
    let editBtnTitle = 'Edit This Site'
    let liveReloadBtnCls = 'nav-live-reload-btn'
    let liveReloadBtnTitle = 'Turn on live reloading'

    if (page.isLiveReloading()) {
      liveReloadBtnCls += ' active'
      liveReloadBtnTitle = 'Turn off live reloading'
    }

    datBtns = [
      yo`
        <button class="nav-peers-btn">
          <i class="fa fa-share-alt"></i> ${page.siteInfo.peers} ${pluralize(page.siteInfo.peers, 'peer')}
        </button>`,
      yo`
        <button class=${liveReloadBtnCls} title=${liveReloadBtnTitle} onclick=${onClickLiveReload}>
          <i class="fa fa-bolt"></i>
        </button>`
    ]

    toolbarActionDatBtns = [
      yo`
        <button class="toolbar-btn raised edit" title=${editBtnTitle} onclick=${onClickEditDat}>
          <i class="fa fa-pencil"></i>
        </button>`,
      yo`
        <button class="toolbar-btn raised fork" title=${forkBtnTitle} onclick=${onClickForkDat}>
          <i class="fa fa-code-fork"></i>
        </button>`
    ]
    toolbarActionDat = yo`<div class="toolbar-group dat">${toolbarActionDatBtns}</div>`
  } else if (siteHasDatAlternative) {
    datBtns = [
      yo`<button title="Go to Dat Version of this Site" onclick=${onClickGotoDatVersion}><span class="fa fa-share-alt"></span></button>`,
    ]
  }

  // autocomplete dropdown
  var autocompleteDropdown = ''
  if (autocompleteResults) {
    autocompleteDropdown = yo`
      <div class="autocomplete-dropdown" onclick=${onClickAutocompleteDropdown}>
        ${autocompleteResults.map((r, i) => {
          // content
          var iconCls = 'icon icon-' + ((r.search) ? 'search' : 'window')
          var contentColumn
          if (r.search)
            contentColumn = yo`<span class="result-search">${r.search}</span>`
          else {
            contentColumn = yo`<span class="result-url"></span>`
            if (r.urlDecorated)
              contentColumn.innerHTML = r.urlDecorated // use innerHTML so our decoration can show
            else
              contentColumn.textContent = r.url
          }
          var titleColumn = yo`<span class="result-title"></span>`
          if (r.titleDecorated)
            titleColumn.innerHTML = r.titleDecorated // use innerHTML so our decoration can show
          else
            titleColumn.textContent = r.title

          // selection
          var rowCls = 'result'
          if (i == autocompleteCurrentSelection)
            rowCls += ' selected'

          // result row
          return yo`<div class=${rowCls} data-result-index=${i}>
            <span class=${iconCls}></span>
            ${contentColumn}
            ${titleColumn}
          </div>`
        })}
      </div>
    `
  }

  // preserve the current address value
  var addrEl = page && page.navbarEl.querySelector('.nav-location-input')
  var addrValue = addrEl ? addrEl.value : ''
  var isAddrElFocused = addrEl && addrEl.matches(':focus')

  // setup site-perms dropdown
  siteInfoNavbarBtn.protocolInfo = (page && page.protocolInfo)
  siteInfoNavbarBtn.siteInfo = (page && page.siteInfo)
  siteInfoNavbarBtn.sitePerms = (page && page.sitePerms)
  siteInfoNavbarBtn.siteInfoOverride = (page && page.siteInfoOverride)

  // the main URL input
  var locationInput = yo`
    <input
      type="text"
      class="nav-location-input${(!isAddrElFocused) ? ' hidden' : ''}"
      onfocus=${onFocusLocation}
      onblur=${onBlurLocation}
      onkeydown=${onKeydownLocation}
      oninput=${onInputLocation}
      value=${addrValue} />
  `

  // a prettified rendering of the main URL input
  var locationPrettyView = renderPrettyLocation(addrValue, isAddrElFocused)

  // render
  return yo`<div data-id=${id} class="toolbar-actions${toolbarHidden}">
    <div class="toolbar-group">
      <button class="toolbar-btn nav-back-btn" ${backDisabled} onclick=${onClickBack}>
        <span class="fa fa-arrow-left"></span>
      </button>
      <button class="toolbar-btn nav-forward-btn" ${forwardDisabled} onclick=${onClickForward}>
        <span class="fa fa-arrow-right"></span>
      </button>
      ${reloadBtn}
    </div>
    <div class="toolbar-input-group">
      ${siteInfoNavbarBtn.render()}
      ${locationPrettyView}
      ${locationInput}
      ${inpageFinder}
      ${zoomBtn}
      ${datBtns}
      <button class=${bookmarkBtnClass} onclick=${onClickBookmark} title="Bookmark this page">
        <span class=${(page && !!page.bookmark) ? "fa fa-star" : "fa fa-star-o"}></span>
      </button>
      ${autocompleteDropdown}
    </div>
    ${toolbarActionDat}
    <div class="toolbar-group">
      ${dropMenuNavbarBtn.render()}
      ${updatesNavbarBtn.render()}
    </div>
  </div>`
}

function renderPrettyLocation (value, isHidden) {
  var valueRendered = value
  if (/^(dat|http|https):/.test(value)) {
    try {
      var { protocol, host, pathname, search, hash } = new URL(value)
      if (protocol === 'dat:' && isDatHashRegex.test(host)) host = prettyHash(host)
      var cls = 'protocol'
      if (['beaker:','https:'].includes(protocol)) cls += ' protocol-secure'
      if (['dat:'].includes(protocol)) cls += ' protocol-p2p'
      valueRendered = [
        yo`<span class=${cls}>${protocol.slice(0, -1)}</span>`,
        yo`<span class="syntax">://</span>`,
        yo`<span class="host">${host}</span>`,
        yo`<span class="path">${pathname}${search}${hash}</span>`,
      ]
    } catch (e) {
      // invalid URL, just use value
    }
  }

  return yo`<div class="nav-location-pretty${(isHidden) ? ' hidden' : ''}" onclick=${onFocusLocation}>
    ${valueRendered}
  </div>`
}

function handleAutocompleteSearch (results) {
  var v = autocompleteCurrentValue
  if (!v) return

  // decorate result with bolded regions
  // explicitly replace special characters to match sqlite fts tokenization
  var searchTerms = v.replace(/[:^*-\.]/g, ' ').split(' ').filter(Boolean)
  results.forEach(r => decorateResultMatches(searchTerms, r))

  // does the value look like a url?
  var multihashV = v.replace(/(^\/|\/$)/g,'') // strip leading and trailing slash
  var isProbablyUrl = (!v.includes(' ') && (
    /\.[A-z]/.test(v) ||
    isDatHashRegex.test(v) ||
    v.startsWith('localhost') ||
    v.includes('://') ||
    v.startsWith('beaker:') ||
    v.startsWith('fs:/')
  ))
  var vWithProtocol = v
  var isGuessingTheScheme = false
  if (isProbablyUrl && !v.includes('://') && !(v.startsWith('beaker:') || v.startsWith('fs:/'))) {
    if (isDatHashRegex.test(v)) {
      vWithProtocol = 'dat://'+v
    } else if (v.startsWith('localhost')) {
      vWithProtocol = 'http://'+v
    } else {
      vWithProtocol = 'https://'+v
      isGuessingTheScheme = true // note that we're guessing so that, if this fails, we can try http://
    }
  }

  // set the top results accordingly
  var gotoResult = { url: vWithProtocol, title: 'Go to '+v, isGuessingTheScheme }
  var searchResult = {
    search: v,
    title: 'DuckDuckGo Search',
    url: 'https://duckduckgo.com/?q=' + v.split(' ').join('+')
  }
  if (isProbablyUrl) autocompleteResults = [gotoResult, searchResult]
  else               autocompleteResults = [searchResult, gotoResult]

  // add search results
  if (results)
    autocompleteResults = autocompleteResults.concat(results)

  // render
  update()
}

function getAutocompleteSelection (i) {
  if (typeof i !== 'number') {
    i = autocompleteCurrentSelection
  }
  if (autocompleteResults && autocompleteResults[i]) {
    return autocompleteResults[i]
  }

  // fallback to the current value in the navbar
  var addrEl = pages.getActive().navbarEl.querySelector('.nav-location-input')
  var url = addrEl.value

  // autocorrect urls of known forms
  if (isDatHashRegex.test(url)) {
    url = 'dat://' + url
  }
  return { url }
}

function getAutocompleteSelectionUrl (i) {
  return getAutocompleteSelection(i).url
}

// helper for autocomplete
// - takes in the current search (tokenized) and a result object
// - mutates `result` so that matching text is bold
var offsetsRegex = /([\d]+ [\d]+ [\d]+ [\d]+)/g
function decorateResultMatches (searchTerms, result) {
  // extract offsets
  var tuples = (result.offsets || '').match(offsetsRegex)
  if (!tuples)
    return

  // iterate all match tuples, and break the values into segments
  let lastTuple
  let segments = { url: [], title: [] }
  let lastOffset = { url: 0, title: 0 }
  for (let tuple of tuples) {
    tuple = tuple.split(' ').map(i => +i) // the map() coerces to the proper type
    let [ columnIndex, termIndex, offset, matchLen ] = tuple
    let columnName = ['url', 'title'][columnIndex]

    // sometimes multiple terms can hit at the same point
    // that breaks the algorithm, so skip that condition
    if (lastTuple && lastTuple[0] === columnIndex && lastTuple[2] === offset) continue
    lastTuple = tuple

    // use the length of the search term
    // (sqlite FTS gives the length of the full matching token, which isnt as helpful)
    let searchTerm = searchTerms[termIndex]
    if (!searchTerm) continue
    let len = searchTerm.length

    // extract segments
    segments[columnName].push(result[columnName].slice(lastOffset[columnName], offset))
    segments[columnName].push(result[columnName].slice(offset, offset+len))
    lastOffset[columnName] = offset + len
  }

  // add the remaining text
  segments.url.push(result.url.slice(lastOffset.url))
  segments.title.push(result.title.slice(lastOffset.title))

  // join the segments with <strong> tags
  result.urlDecorated = joinSegments(segments.url)
  result.titleDecorated = joinSegments(segments.title)
}

// helper for decorateResultMatches()
// - takes an array of string segments (extracted from the result columns)
// - outputs a single escaped string with every other element wrapped in <strong>
var ltRegex = /</g
var gtRegex = />/g
function joinSegments (segments) {
  var str = ''
  var isBold = false
  for (var segment of segments) {
    // escape for safety
    segment = segment.replace(ltRegex, '&lt;').replace(gtRegex, '&gt;')

    // decorate with the strong tag
    if (isBold) str += '<strong>' + segment + '</strong>'
    else        str += segment
    isBold = !isBold
  }
  return str
}

function countMatches (str, regex) {
  var matches = str.match(regex)
  return (matches) ? matches.length : 0
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
  if (page) {
    page.toggleBookmark()

    // animate the element TODO
    // document.querySelector('.toolbar-actions:not(.hidden) .nav-bookmark-btn .fa').animate([
    //   {textShadow: '0 0 0px rgba(0, 18, 150, 1.0)'},
    //   {textShadow: '0 0 8px rgba(0, 18, 150, 1.0)'},
    //   {textShadow: '0 0 16px rgba(0, 18, 150, 0.0)'}
    // ], { duration: 300 })
  }
}

// helper for some click events
function openDatView (e, view) {
  var page = getEventPage(e)
  if (!page || !page.getURL().startsWith('dat://')) return

  // get the target url
  var url = page.getViewFilesURL(view)
  if (!url) return

  // start loading
  if (e.metaKey || e.ctrlKey) { // popup
    pages.setActive(pages.create(url))
  } else {
    page.loadURL(url) // goto
  }
}

async function onClickForkDat (e) {
  var page = getEventPage(e)
  if (!page || !page.getURL().startsWith('dat://')) return

  var archive = await DatArchive.fork(page.getURL())
  page.loadURL(archive.url)
}

async function onClickEditDat (e) {
  var page = getEventPage(e)
  if (!page || !page.getURL().startsWith('dat://')) return

  // open tab loading
  const url = `beaker://editor/${page.getURL().slice('dat://'.length)}`
  if (e.metaKey || e.ctrlKey) { // popup
    pages.setActive(pages.create(url))
  } else {
    page.loadURL(url) // goto
  }
}

function onClickViewFiles (e) {
  openDatView(e, 'files')
}

function onClickLiveReload (e) {
  var page = getEventPage(e)
  if (!page || !page.siteInfo) return
  page.toggleLiveReloading()
}

function onClickGotoDatVersion (e) {
  const page = getEventPage(e)
  if (!page || !page.protocolInfo) return

  const url = `dat://${page.protocolInfo.hostname}`
  if (e.metaKey || e.ctrlKey) { // popup
    pages.setActive(pages.create(url))
  } else {
    page.loadURL(url) // goto
  }
}

function onClickZoom (e) {
  const { Menu } = remote
  var menu = Menu.buildFromTemplate([
    { label: 'Reset Zoom', click: () => zoom.zoomReset(pages.getActive()) },
    { label: 'Zoom In', click: () => zoom.zoomIn(pages.getActive()) },
    { label: 'Zoom Out', click: () => zoom.zoomOut(pages.getActive()) }
  ])
  menu.popup(remote.getCurrentWindow())
}

function onFocusLocation (e) {
  var page = getEventPage(e)
  if (page) {
    page.navbarEl.querySelector('.nav-location-pretty').classList.add('hidden')
    page.navbarEl.querySelector('.nav-location-input').classList.remove('hidden')
    page.navbarEl.querySelector('.nav-location-input').select()
  }
}

function onBlurLocation (e) {
  // HACK
  // blur gets called right before the click event for onClickAutocompleteDropdown
  // so, wait a bit before clearing the autocomplete, so the click has a chance to fire
  // -prf
  setTimeout(clearAutocomplete, 150)
  var page = getEventPage(e)
  if (page) {
    page.navbarEl.querySelector('.nav-location-pretty').classList.remove('hidden')
    page.navbarEl.querySelector('.nav-location-input').classList.add('hidden')
  }
}

function onInputLocation (e) {
  var value = e.target.value

  // run autocomplete
  // TODO debounce
  var autocompleteValue = value.trim()
  if (autocompleteValue && autocompleteCurrentValue != autocompleteValue) {
    autocompleteCurrentValue = autocompleteValue // update the current value
    autocompleteCurrentSelection = 0 // reset the selection
    beaker.history.search(value).then(handleAutocompleteSearch) // update the suggetsions
  } else if (!autocompleteValue)
    clearAutocomplete() // no value, cancel out
}

function onKeydownLocation (e) {
  // on enter
  if (e.keyCode == KEYCODE_ENTER) {
    e.preventDefault()

    var page = getEventPage(e)
    if (page) {
      var selection = getAutocompleteSelection()
      page.loadURL(selection.url, { isGuessingTheScheme: selection.isGuessingTheScheme })
      e.target.blur()
    }
    return
  }

  // on escape
  if (e.keyCode == KEYCODE_ESC) {
    var page = getEventPage(e)
    page.navbarEl.querySelector('.nav-location-input').value = page.getIntendedURL()
    e.target.blur()
    return
  }

  // on keycode navigations
  var up   = (e.keyCode == KEYCODE_UP || (e.ctrlKey && e.keyCode == KEYCODE_P))
  var down = (e.keyCode == KEYCODE_DOWN || (e.ctrlKey && e.keyCode == KEYCODE_N))
  if (autocompleteResults && (up || down)) {
    e.preventDefault()
    if (up && autocompleteCurrentSelection > 0)
      autocompleteCurrentSelection--
    if (down && autocompleteCurrentSelection < autocompleteResults.length - 1)
      autocompleteCurrentSelection++

    // re-render and update the url
    var page = getEventPage(e)
    var newValue = getAutocompleteSelectionUrl(autocompleteCurrentSelection)
    page.navbarEl.querySelector('.nav-location-input').value = newValue
    update(page)
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
    let page = getEventPage(e)
    if (page)
      hideInpageFind(page)
  }

  // on enter
  if (e.keyCode == KEYCODE_ENTER) {
    let str = e.target.value
    let backwards = e.shiftKey // search backwords on shift+enter
    let page = getEventPage(e)
    if (page) {
      if (str) page.findInPage(str, { findNext: true, forward: !backwards })
      else     page.stopFindInPage('clearSelection')
    }
  }
}
