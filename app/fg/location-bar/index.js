/* globals customElements */
import * as rpc from 'pauls-electron-rpc'
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { unsafeHTML } from '../vendor/lit-element/lit-html/directives/unsafe-html'
import { examineLocationInput } from '../../lib/urls'
import { joinPath } from '../../lib/strings'
import _uniqWith from 'lodash.uniqwith'
import browserManifest from '../../bg/web-apis/manifests/internal/browser'
import bookmarksManifest from '../../bg/web-apis/manifests/internal/bookmarks'
import hyperdriveManifest from '../../bg/web-apis/manifests/external/hyperdrive'
import historyManifest from '../../bg/web-apis/manifests/internal/history'
import locationBarManifest from '../../bg/rpc-manifests/location-bar'
import beakerFsManifest from '../../bg/web-apis/manifests/internal/beaker-filesystem'
import viewsManifest from '../../bg/rpc-manifests/views'
const bg = {
  beakerBrowser: rpc.importAPI('beaker-browser', browserManifest),
  bookmarks: rpc.importAPI('bookmarks', bookmarksManifest),
  hyperdrive: rpc.importAPI('hyperdrive', hyperdriveManifest),
  history: rpc.importAPI('history', historyManifest),
  locationBar: rpc.importAPI('background-process-location-bar', locationBarManifest),
  beakerFs: rpc.importAPI('beaker-filesystem', beakerFsManifest),
  views: rpc.importAPI('background-process-views', viewsManifest)
}

class LocationBar extends LitElement {
  static get properties () {
    return {
      inputValue: {type: String},
      autocompleteResults: {type: Array},
      currentSelection: {type: Number},
      hoveredSearch: {type: String}
    }
  }

  constructor () {
    super()
    this.reset()
    this.fetchBrowserInfo()

    // disallow right click
    window.addEventListener('contextmenu', e => e.preventDefault())

    // export interface
    window.setup = () => this.reset()
    window.command = (command, opts) => this.onCommand(command, opts)
  }

  async fetchBrowserInfo () {
    var {platform} = await bg.beakerBrowser.getInfo()
    window.platform = platform
    if (platform === 'darwin') {
      document.body.classList.add('darwin')
    }
    if (platform === 'win32') {
      document.body.classList.add('win32')
    }
  }

  reset () {
    this.currentTabLocation = undefined
    this.inputValue = ''
    this.inputQuery = ''
    this.autocompleteResults = []
    this.currentSelection = 0
    this.hoveredSearch = ''
    this.queryIdCounter = 0
    this.bookmarksFetch = bg.bookmarks.list()
    this.searchEnginesPromise = bg.beakerBrowser.getSetting('search_engines')
  }

  selectResult (result) {
    bg.locationBar.loadURL(result.url)
    bg.locationBar.close()
  }

  render () {
    const searchLink = (label, url) => {
      return html`
        <a
          title=${label}
          data-href=${url}
          @mouseenter=${this.onMouseenterSearch}
          @mouseleave=${this.onMouseleaveSearch}
          @click=${this.onClickSearch}
        >
          <img src="beaker://assets/search-engines/${label.toLowerCase()}.png">
        </a>
      `
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <input
          type="text"
          value=${this.inputValue}
          @input=${this.onInputLocation}
          @keydown=${this.onKeydownLocation}
          @contextmenu=${this.onContextMenu}
          @blur=${this.onInputBlur}
        >
        <div class="autocomplete-results">
          ${repeat(this.autocompleteResults, (r, i) => this.renderAutocompleteResult(r, i))}
        </div>
        <div class="search-engines">
          <div class="label">
            ${this.hoveredSearch
              ? html`Search <strong>${this.hoveredSearch}</strong>`
              : html`Search for <strong>${this.inputQuery}</strong> with:`
            }
          </div>
          <div class="list">
            ${searchLink('Twitter', `https://twitter.com/search?q=${encodeURIComponent(this.inputQuery)}`)}
            ${searchLink('Reddit', `https://reddit.com/search?q=${encodeURIComponent(this.inputQuery)}`)}
            ${searchLink('GitHub', `https://github.com/search?q=${encodeURIComponent(this.inputQuery)}`)}
            ${searchLink('DuckDuckGo', `https://duckduckgo.com?q=${encodeURIComponent(this.inputQuery)}`)}
            ${searchLink('Google', `https://google.com/search?q=${encodeURIComponent(this.inputQuery)}`)}
            ${searchLink('YouTube', `https://www.youtube.com/results?search_query=${encodeURIComponent(this.inputQuery)}`)}
            ${searchLink('Wikipedia', `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(this.inputQuery)}`)}
            ${''/* TODO restore at some point esearchLink('Beaker', `beaker://search/?q=${encodeURIComponent(this.inputQuery)}`) */}
          </div>
        </div>
      </div>
    `
  }

  renderAutocompleteResult (r, i) {
    // selection
    var rowCls = classMap({
      result: true,
      selected: i === this.currentSelection
    })

    // result row
    return html`
      <div class=${rowCls} data-result-index=${i} @click=${this.onClickResult}>
        ${this.renderResult(r)}
      </div>
    `
  }

  renderResult (r) {
    if (r.search) {
      return html`
        <div class="icon"><i class="fa fa-search"></i></div>
        <div class="title">${r.search} - ${r.title}</div>
      `
    }
    if (r.isGoto) {
      return html`
        <div class="icon"><i class="fas fa-arrow-right"></i></div>
        <div class="title">${r.title}</div>
      `
    }
    if (r.isDriveEntry) {
      return html`
        <div class="icon"><i class="far fa-${isFolder(r) ? 'folder' : 'file'}"></i></div>
        <div class="title">${r.nameDecorated}</div>
        <div class="provenance">${r.path}</div>
      `
    }
    if (r.isBookmark) {
      return html`
        <div class="icon"><i class="fas fa-star"></i></div>
        <div class="title">${r.titleDecorated}</div>
        <div class="provenance">${r.urlDecorated}</div>
      `
    }
    return html`
      <div class="icon"><img src=${'asset:favicon-32:' + r.url}></div>
      <div class="title">${r.titleDecorated ? unsafeHTML(r.titleDecorated) : r.title}</div>
      <div class="provenance">
        ${toNiceUrl(r.urlDecorated ? unsafeHTML(r.urlDecorated) : r.url)}
      </div>
    `
  }

  // events
  // =

  onCommand (cmd, opts) {
    switch (cmd) {
      case 'set-value':
        if (!opts.value || opts.value !== this.inputValue) {
          this.inputQuery = this.inputValue = opts.value
          this.currentSelection = 0

          // update the input
          var input = this.shadowRoot.querySelector('input')
          input.value = this.inputValue
          input.focus()
          if (typeof opts.selectionStart === 'number') {
            input.setSelectionRange(opts.selectionStart, opts.selectionStart)
          } else {
            input.setSelectionRange(input.value.length, input.value.length)
          }

          this.queryAutocomplete()
        }
        break
      case 'choose-selection':
        this.selectResult(this.autocompleteResults[this.currentSelection])
        break
      case 'move-selection':
        {
          if (opts.up && this.currentSelection > 0) { this.currentSelection = this.currentSelection - 1 }
          if (opts.down && this.currentSelection < this.autocompleteResults.length - 1) { this.currentSelection = this.currentSelection + 1 }
          let res = this.autocompleteResults[this.currentSelection]
          this.inputValue = res.url
          return res.search || res.url
        }
    }
  }

  onInputLocation (e) {
    var value = e.currentTarget.value.trim()
    if (!value || this.inputValue !== value) {
      this.inputQuery = this.inputValue = value // update the current value
      this.currentSelection = 0 // reset the selection
      this.queryAutocomplete()
    }
  }

  async onKeydownLocation (e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      this.selectResult(this.autocompleteResults[this.currentSelection])
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      bg.locationBar.close()
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      let unmatchedNamePortion = undefined
      let selection = this.autocompleteResults[this.currentSelection]
      if (selection.isDriveEntry) {
        unmatchedNamePortion = selection.unmatchedNamePortion
        if (isFolder(selection)) unmatchedNamePortion += '/'
      } else {
        let driveEntries = this.autocompleteResults.filter(r => r.isDriveEntry)
        if (driveEntries.length === 1) {
          unmatchedNamePortion = driveEntries[0].unmatchedNamePortion
          if (isFolder(driveEntries[0])) unmatchedNamePortion += '/'
        }
      }
      if (unmatchedNamePortion) {
        this.shadowRoot.querySelector('input').value = this.inputValue = this.inputQuery + unmatchedNamePortion
        this.queryAutocomplete()
      }
    }

    var up = (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p'))
    var down = (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n'))
    if (up || down) {
      e.preventDefault()
      if (up && this.currentSelection > 0) { this.currentSelection = this.currentSelection - 1 }
      if (down && this.currentSelection < this.autocompleteResults.length - 1) { this.currentSelection = this.currentSelection + 1 }
      this.shadowRoot.querySelector('input').value = this.inputValue = this.autocompleteResults[this.currentSelection].url
    }
  }

  onContextMenu (e) {
    e.preventDefault()
    e.stopPropagation()
    bg.views.showLocationBarContextMenu('active')
  }

  onInputBlur (e) {
    setTimeout(() => bg.locationBar.close(), 200)
  }

  onClickResult (e) {
    this.selectResult(this.autocompleteResults[e.currentTarget.dataset.resultIndex])
  }

  resize () {
    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.locationBar.resizeSelf({height})
  }

  async queryAutocomplete () {
    var queryId = ++this.queryIdCounter
    this.inputValue = this.inputValue.trim()
    var finalResults
    
    var searchEngines = await this.searchEnginesPromise
    var searchEngine = searchEngines.find(se => se.selected) || searchEngines[0]

    // figure out what we're looking at
    var {vWithProtocol, vSearch, isProbablyUrl, isGuessingTheScheme} = examineLocationInput(this.inputValue || '/')

    // set the top results accordingly
    var gotoResult = { url: vWithProtocol, title: 'Go to ' + (this.inputValue || '/'), isGuessingTheScheme, isGoto: true }

    var searchResult = {
      search: this.inputValue,
      title: `Search ${searchEngine.name} for "${this.inputValue}"`,
      url: searchEngine.url + vSearch
    }
    if (isProbablyUrl) finalResults = [gotoResult, searchResult]
    else finalResults = [searchResult, gotoResult]

    // optimistically update the first two results
    this.autocompleteResults = finalResults.concat(this.autocompleteResults.slice(2))
    this.requestUpdate()
    this.updateComplete.then(() => this.resize())

    // determine the URL that the user is targeting (only if it references a drive)
    var inputDriveUrl = undefined
    var inputDriveUrlp = undefined
    var isDriveUrlRe = /^hyper:\/\//i
    if (this.inputValue.startsWith('/')) {
      if (!this.currentTabLocation) {
        this.currentTabLocation = (await bg.views.getTabState('active').catch(e => ({url: ''}))).url
      }
      if (isDriveUrlRe.test(this.currentTabLocation)) {
        try {
          let urlp = new URL(this.currentTabLocation)
          inputDriveUrl = joinPath(urlp.origin, this.inputValue.slice(1))
        } catch (e) {
          // ignore, bad url
        }
      }
    } else if (isDriveUrlRe.test(this.inputValue)) {
      inputDriveUrl = this.inputValue
    }
    if (inputDriveUrl) {
      try {
        inputDriveUrlp = new URL(inputDriveUrl)
      } catch (e) {
        // just ignore
      }
    }

    var [driveResults, historyResults, bookmarks] = await Promise.all([
      inputDriveUrlp ? searchDrive(inputDriveUrlp) : [],
      this.inputValue ? bg.history.search(this.inputValue) : [],
      this.bookmarksFetch
    ])

    var bookmarkResults = []
    {
      let query = this.inputValue.toLowerCase()
      for (let bookmark of bookmarks) {
        let titleIndex = bookmark.title.toLowerCase().indexOf(query)
        let hrefIndex = bookmark.href.indexOf(query)
        if (titleIndex === -1 && hrefIndex === -1) {
          continue
        }

        var titleDecorated = bookmark.title
        if (titleIndex !== -1) {
          let t = bookmark.title
          let start = titleIndex
          let end = start + query.length
          titleDecorated = html`${t.slice(0, start)}<strong>${t.slice(start, end)}</strong>${t.slice(end)}`
        }

        var urlDecorated = bookmark.href
        if (hrefIndex !== -1) {
          let h = bookmark.href
          let start = hrefIndex
          let end = start + query.length
          urlDecorated = html`${h.slice(0, start)}<strong>${h.slice(start, end)}</strong>${h.slice(end)}`
        }

        bookmarkResults.push({
          isBookmark: true,
          url: bookmark.href,
          urlDecorated,
          titleDecorated
        })
      }
    }

    // abort if changes to the input have occurred since triggering these queries
    if (queryId !== this.queryIdCounter) return

    // decorate results with bolded regions
    var searchTerms = this.inputValue.replace(/[:^*-./]/g, ' ').split(' ').filter(Boolean)
    historyResults.forEach(r => highlightHistoryResult(searchTerms, r))

    // add search results
    finalResults = finalResults.concat(driveResults)
    finalResults = finalResults.concat(bookmarkResults)
    finalResults = finalResults.concat(historyResults)

    // remove duplicates
    finalResults = _uniqWith(finalResults, (a, b) => normalizeURL(a.url) === normalizeURL(b.url)) // remove duplicates

    // apply limit
    finalResults = finalResults.slice(0, 10)

    // render
    this.autocompleteResults = finalResults

    await this.updateComplete
    this.resize()
  }

  onMouseenterSearch (e) {
    this.hoveredSearch = e.currentTarget.getAttribute('title')
  }

  onMouseleaveSearch () {
    this.hoveredSearch = ''
  }

  onClickSearch (e) {
    e.preventDefault()
    bg.locationBar.loadURL(e.currentTarget.dataset.href)
    bg.locationBar.close()
  }
}
LocationBar.styles = [css`
.wrapper {
  background: #fff;
  border-radius: 16px;
}

input {
  box-sizing: border-box;
  border: 0;
  border-radius: 16px;
  padding: 0 54px;

  line-height: 26px;
  width: 100%;
  height: 32px;
  overflow: hidden;

  color: #222;
  font-size: 13.5px;
  font-family: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif;
  font-weight: 400;
  letter-spacing: 0.5px;
}

input:focus {
  outline: 0;
}

.autocomplete-results {
  max-height: 482px;
  overflow-y: auto;
}

.result {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  line-height: 20px;
  width: calc(100vw - 46px);
  overflow: hidden;
  border-top: 1px solid #eef;
}

.result:last-child {
  border-bottom: 1px solid #eef;
}

.result .icon {
  flex: 0 0 42px;
}

.result .icon img {
  width: 16px;
  height: 16px;
  margin-left: 7px;
}

.result .icon .fa,
.result .icon .fas,
.result .icon .far {
  font-size: 13px;
  color: #707070;
  margin-left: 9px;
}

.result .title,
.result .provenance {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  color: #1f55c1;
}

.result .title,
.result .provenance {
  flex: 1;
}

.result .provenance {
  color: #778;
}

.result.selected {
  background: #dbebff;
}

.result.selected .result-title {
  color: #333;
}

.result:hover {
  background: #f6f6fd;
}

.search-engines {
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
}

.search-engines .label {
  padding: 12px 18px 8px;
  font-size: 11px;
}

.search-engines .list {
  display: flex;
  align-items: center;
  padding-bottom: 4px;
}

.search-engines .list a {
  border-radius: 50%;
  flex: 0 0 42px;
  text-align: center;
  padding: 8px 0;
  margin-left: 12px;
  cursor: pointer;
}

.search-engines .list a:hover {
  background: #f0f0f8;
}

.search-engines .list a img {
  width: 24px;
  height: 24px;
}
`]

customElements.define('location-bar', LocationBar)

// internal methods
// =

const TRAILING_SLASH_REGEX = /(\/$)/
function normalizeURL (str = '') {
  return str.replace(TRAILING_SLASH_REGEX, '')
}

function makeSafe (str = '') {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

const DRIVE_KEY_REGEX = /([0-9a-f]{64})/ig
function toNiceUrl (str) {
  if (typeof str !== 'string') return str
  return str.replace(DRIVE_KEY_REGEX, (_, m) => `${m.slice(0, 6)}..${m.slice(-2)}`)
}

async function searchDrive (urlp) {
  try {
    var nameFilter = undefined
    var parentFolderPath = urlp.pathname
    if (!parentFolderPath.endsWith('/')) {
      let parts = parentFolderPath.split('/')
      nameFilter = parts.pop()
      parentFolderPath = parts.join('/')
    }

    var items = await bg.hyperdrive.readdir(joinPath(urlp.origin, parentFolderPath), {timeout: 2e3, includeStats: true})
    if (nameFilter) {
      nameFilter = nameFilter.toLowerCase()
      items = items.filter(item => item.name.toLowerCase().startsWith(nameFilter))
    }
    items.sort((a, b) => a.name.localeCompare(b.name))

    for (let item of items) {
      item.isDriveEntry = true
      item.unmatchedNamePortion = nameFilter ? item.name.slice(nameFilter.length) : item.name
      item.nameDecorated = nameFilter ? html`<strong>${nameFilter}</strong>${item.unmatchedNamePortion}` : item.name
      item.path = joinPath(parentFolderPath, item.name)
      item.url = joinPath(urlp.origin, item.path)
    }

    return items
  } catch (e) {
    console.debug('Failed to readdir', e)
    return []
  }
}

function isFolder (item) {
  return (item.stat.mode & 16384) === 16384
}

// helper for history search results
// - takes in the current search (tokenized) and a result object
// - mutates `result` so that matching text is bold
var offsetsRegex = /([\d]+ [\d]+ [\d]+ [\d]+)/g
function highlightHistoryResult (searchTerms, result) {
  // extract offsets
  var tuples = (result.offsets || '').match(offsetsRegex)
  if (!tuples) { return }

  // iterate all match tuples, and break the values into segments
  let lastTuple
  let segments = { url: [], title: [] }
  let lastOffset = { url: 0, title: 0 }
  for (let tuple of tuples) {
    tuple = tuple.split(' ').map(i => +i) // the map() coerces to the proper type
    let [ columnIndex, termIndex, offset ] = tuple
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
    segments[columnName].push(result[columnName].slice(offset, offset + len))
    lastOffset[columnName] = offset + len
  }

  // add the remaining text
  segments.url.push(result.url.slice(lastOffset.url))
  segments.title.push(result.title.slice(lastOffset.title))

  // join the segments with <strong> tags
  result.urlDecorated = toNiceUrl(joinSegments(segments.url))
  result.titleDecorated = joinSegments(segments.title)
}

// helper for highlightHistoryResult()
// - takes an array of string segments (extracted from the result columns)
// - outputs a single escaped string with every other element wrapped in <strong>
function joinSegments (segments) {
  var str = ''
  var isBold = false
  for (var segment of segments) {
    // escape for safety
    segment = makeSafe(segment)

    // decorate with the strong tag
    if (isBold) str += '<strong>' + segment + '</strong>'
    else str += segment
    isBold = !isBold
  }
  return str
}
