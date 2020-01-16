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
import hyperdriveManifest from '../../bg/web-apis/manifests/external/hyperdrive'
import historyManifest from '../../bg/web-apis/manifests/internal/history'
import locationBarManifest from '../../bg/rpc-manifests/location-bar'
import navigatorManifestFs from '../../bg/web-apis/manifests/external/navigator-filesystem'
import viewsManifest from '../../bg/rpc-manifests/views'

const bg = {
  beakerBrowser: rpc.importAPI('beaker-browser', browserManifest),
  hyperdrive: rpc.importAPI('hyperdrive', hyperdriveManifest),
  history: rpc.importAPI('history', historyManifest),
  locationBar: rpc.importAPI('background-process-location-bar', locationBarManifest),
  navigatorFs: rpc.importAPI('navigator-filesystem', navigatorManifestFs),
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
    this.homeDriveUrl = undefined

    // fetch platform information
    var {platform} = bg.beakerBrowser.getInfo()
    window.platform = platform
    if (platform === 'darwin') {
      document.body.classList.add('darwin')
    }
    if (platform === 'win32') {
      document.body.classList.add('win32')
    }

    // disallow right click
    window.addEventListener('contextmenu', e => e.preventDefault())

    // export interface
    window.setup = () => this.reset()
    window.command = (command, opts) => this.onCommand(command, opts)
  }

  reset () {
    this.currentTabLocation = undefined
    this.inputValue = ''
    this.inputQuery = ''
    this.autocompleteResults = []
    this.currentSelection = 0
    this.hoveredSearch = ''
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
        <div class="info"><div class="row"><span class="search-column">${r.search} - ${r.title}</span></div></div>
      `
    }
    if (r.isGoto) {
      return html`
        <div class="icon"><i class="fas fa-arrow-right"></i></div>
        <div class="info"><div class="row"><span class="content-column"><span class="title">${r.title}</span></span></div></div>
      `
    }
    if (r.isDriveEntry) {
      return html`
        <div class="icon"><i class="far fa-${isFolder(r) ? 'folder' : 'file'}"></i></div>
        <div class="info">
          <div class="row">
            <span class="content-column">
              <span class="title">${r.nameDecorated}</span>
            </span>
          </div>
          <div class="row provenance">
            ${r.path}
          </div>
        </div>
      `
    }
    return html`
      <div class="icon"><img src=${'asset:favicon-32:' + r.url}></div>
      <div class="info">
        <div class="row">
          <span class="content-column">
            <span class="title">${r.titleDecorated ? unsafeHTML(r.titleDecorated) : r.title}</span>
            ${r.descriptionDecorated ? html`<span class="description">| ${unsafeHTML(r.descriptionDecorated)}</span>` : ''}
          </span>
        </div>
        <div class="row provenance">
          ${''/*<span class="fas fa-fw fa-history"></span>*/}
          ${toNiceUrl(r.urlDecorated ? unsafeHTML(r.urlDecorated) : r.url)}
        </div>
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
          if (this.inputValue.startsWith('beaker://library')) {
            this.inputQuery = this.inputValue = ''
          }

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

  onKeydownLocation (e) {
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
    bg.views.showLocationBarContextMenu('active')
  }

  onInputBlur (e) {
    setTimeout(() => bg.locationBar.close(), 100)
  }

  onClickResult (e) {
    this.selectResult(this.autocompleteResults[e.currentTarget.dataset.resultIndex])
  }

  resize () {
    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.locationBar.resizeSelf({height})
  }

  async queryAutocomplete () {
    this.inputValue = this.inputValue.trim()

    // determine the URL that the user is targeting (only if it references a drive)
    var inputDriveUrl = undefined
    var inputDriveUrlp = undefined
    var isDriveUrlRe = /^(drive|web):\/\//i
    if (this.inputValue.startsWith('~')) {
      if (!this.homeDriveUrl) {
        this.homeDriveUrl = bg.navigatorFs.get().url
      }
      inputDriveUrl = joinPath(this.homeDriveUrl, this.inputValue.slice(1))
    } else if (this.inputValue.startsWith('/')) {
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

    var finalResults
    var [driveResults, historyResults] = await Promise.all([
      inputDriveUrlp ? searchDrive(inputDriveUrlp) : [],
      this.inputValue ? bg.history.search(this.inputValue) : []
    ])

    // console.log({
      // historyResults,
      // driveResults
    // })

    // decorate results with bolded regions
    var searchTerms = this.inputValue.replace(/[:^*-./]/g, ' ').split(' ').filter(Boolean)
    historyResults.forEach(r => highlightHistoryResult(searchTerms, r))

    // figure out what we're looking at
    var {vWithProtocol, vSearch, isProbablyUrl, isGuessingTheScheme} = examineLocationInput(this.inputValue || '/')

    // set the top results accordingly
    var gotoResult = { url: vWithProtocol, title: 'Go to ' + (this.inputValue || '/'), isGuessingTheScheme, isGoto: true }
    var searchResult = {
      search: this.inputValue,
      title: `Search DuckDuckGo for "${this.inputValue}"`,
      url: vSearch
    }
    if (isProbablyUrl) finalResults = [gotoResult, searchResult]
    else finalResults = [searchResult, gotoResult]

    // add search results
    finalResults = finalResults.concat(driveResults)
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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif;
  font-weight: 500;
  letter-spacing: -.2px;
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
}

.result .icon {
  flex: 0 0 42px;
}

.result .info {
  flex: 1;
}

.result .icon img {
  width: 32px;
  height: 32px;
}

.result .icon .avatar {
  border-radius: 50%;
  object-fit: cover;
}

.result .icon .fa,
.result .icon .fas,
.result .icon .far {
  font-size: 13px;
  color: #707070;
  margin-left: 9px;
}

.result .icon .fa-folder {
  -webkit-text-stroke: 1px #fff;
  font-size: 26px;
  margin-left: 3px;
  color: #889;
}

.result .icon .fa-file {
  -webkit-text-stroke: 1px #fff;
  font-size: 26px;
  margin-left: 6px;
  color: #889;
}

.result .content-column,
.result .search-column {
  font-size: 15px;
}

.result .content-column,
.result .search-column {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.result .title,
.result .description {
  color: #1f55c1;
}

.result .description {
  margin-left: 2px;
}

.result .tags {
  margin-left: 5px;
}

.provenance {
  font-size: 13px;
  color: #555;
}

.provenance .fas,
.provenance .far {
  font-size: 11px;
  position: relative;
  top: -1px;
  margin-right: 2px;
  color: gray;
}

.provenance .url {
  margin-left: 5px;
}

.result.selected {
  background: #dbebff;
}

.result.selected .result-title {
  color: #333;
}

.result:hover {
  background: #eee;
}

.search-engines {
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
}

.search-engines .label {
  padding: 6px 8px 4px;
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

const DAT_KEY_REGEX = /([0-9a-f]{64})/ig
function toNiceUrl (str) {
  if (typeof str !== 'string') return str
  return str.replace(DAT_KEY_REGEX, (_, m) => `${m.slice(0, 6)}..${m.slice(-2)}`)
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

    var items = await bg.hyperdrive.readdir(urlp.origin, parentFolderPath, {timeout: 2e3, includeStats: true})
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
