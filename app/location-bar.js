/* globals customElements */
import * as rpc from 'pauls-electron-rpc'
import { LitElement, html, css } from './vendor/lit-element/lit-element'
import { repeat } from './vendor/lit-element/lit-html/directives/repeat'
import { classMap } from './vendor/lit-element/lit-html/directives/class-map'
import { unsafeHTML } from './vendor/lit-element/lit-html/directives/unsafe-html'
import { examineLocationInput } from './lib/urls'
import _uniqWith from 'lodash.uniqwith'
import browserManifest from '@beaker/core/web-apis/manifests/internal/browser'
import bookmarksManifest from '@beaker/core/web-apis/manifests/external/bookmarks'
import historyManifest from '@beaker/core/web-apis/manifests/internal/history'
import searchManifest from '@beaker/core/web-apis/manifests/external/search'
import locationBarManifest from './background-process/rpc-manifests/location-bar'
import viewsManifest from './background-process/rpc-manifests/views'

const bg = {
  beakerBrowser: rpc.importAPI('beaker-browser', browserManifest),
  bookmarks: rpc.importAPI('bookmarks', bookmarksManifest),
  history: rpc.importAPI('history', historyManifest),
  search: rpc.importAPI('search', searchManifest),
  locationBar: rpc.importAPI('background-process-location-bar', locationBarManifest),
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
    this.userUrl = null
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
    if (r.record && r.record.type === 'site') {
      return html`
        <div class="icon"><img class="avatar" src=${'asset:thumb:' + r.url}></div>
        <div class="info">
          <div class="row">
            <span class="content-column">
              <span class="title">${r.titleDecorated ? unsafeHTML(r.titleDecorated) : r.title}</span>
              ${r.descriptionDecorated ? html`<span class="description">| ${unsafeHTML(r.descriptionDecorated)}</span>` : ''}
            </span>
          </div>
          <div class="row provenance">
            <span class="fas fa-fw fa-user"></span>
            ${r.url === this.userUrl ? html`This is <span class="is-you">you</span>` : 'Followed by you'}
            <span class="url">${toNiceUrl(r.url)}</span>
          </div>
        </div>
      `
    }
    if (r.record && r.record.type === 'unwalled.garden/bookmark') {
      let isAuthorYou = r.record.author.url === this.userUrl
      let authorTitle = isAuthorYou ? html`<span class="is-you">you</span>`: (r.record.author.title || 'Anonymous')
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
            <span class="fas fa-fw fa-star"></span>
            Bookmarked by ${authorTitle}
            <span class="url">${toNiceUrl(r.url)}</span>
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
        <div class="row provenance"><span class="url-column">${toNiceUrl(r.urlDecorated ? unsafeHTML(r.urlDecorated) : r.url)}</span></div>
      </div>
    `
  }

  // events
  // =

  onCommand (cmd, opts) {
    switch (cmd) {
      case 'set-value':
        if (opts.value && opts.value !== this.inputValue) {
          this.inputQuery = this.inputValue = opts.value
          this.currentSelection = 0
          if (this.inputValue.startsWith('beaker://start')) {
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
    if (value && this.inputValue !== value) {
      this.inputQuery = this.inputValue = value // update the current value
      this.currentSelection = 0 // reset the selection
      this.queryAutocomplete()
    }
  }

  onKeydownLocation (e) {
    // on enter
    if (e.key === 'Enter') {
      e.preventDefault()

      this.selectResult(this.autocompleteResults[this.currentSelection])
      return
    }

    // on escape
    if (e.key === 'Escape') {
      e.preventDefault()
      bg.locationBar.close()
      return
    }

    // on keycode navigations
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
    if (!this.userUrl) {
      let userSession = await bg.beakerBrowser.getUserSession().catch(err => null)
      this.userUrl = userSession ? userSession.url : null
    }

    this.inputValue = this.inputValue.trim()

    var finalResults
    var [crawlerResults, historyResults] = await Promise.all([
      bg.search.query({query: this.inputValue, filters: {datasets: ['sites', 'unwalled.garden/bookmark']}, limit: 10}),
      bg.history.search(this.inputValue)
    ])

    // console.log({
    //   historyResults,
    //   crawlerResults
    // })

    // decorate results with bolded regions
    var searchTerms = this.inputValue.replace(/[:^*-./]/g, ' ').split(' ').filter(Boolean)
    crawlerResults.results.forEach(r => highlightSearchResult(searchTerms, crawlerResults.highlightNonce, r))
    historyResults.forEach(r => highlightHistoryResult(searchTerms, r))

    // figure out what we're looking at
    var {vWithProtocol, vSearch, isProbablyUrl, isGuessingTheScheme} = examineLocationInput(this.inputValue)

    // set the top results accordingly
    var gotoResult = { url: vWithProtocol, title: 'Go to ' + this.inputValue, isGuessingTheScheme, isGoto: true }
    var searchResult = {
      search: this.inputValue,
      title: `Search DuckDuckGo for "${this.inputValue}"`,
      url: vSearch
    }
    if (isProbablyUrl) finalResults = [gotoResult, searchResult]
    else finalResults = [searchResult, gotoResult]

    // add search results
    finalResults = finalResults.concat(crawlerResults.results)
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
  border-radius: 4px;
}

input {
  box-sizing: border-box;
  border: 0;
  border-radius: 4px;
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
.result .icon .fas {
  font-size: 13px;
  color: #707070;
  margin-left: 9px;
}

.result .content-column,
.result .search-column {
  font-size: 15px;
}

.result .url-column,
.result .content-column,
.result .search-column {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.result .url-column {
  color: #707070;
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

.provenance .fas {
  font-size: 11px;
  position: relative;
  top: -1px;
  margin-right: 2px;
  color: gray;
}

.provenance .url {
  margin-left: 5px;
}

.is-you {
  color: #3a3d4e;
  font-weight: 500;
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
  border-top: 1px solid #ddd;
  background: #f7f7f7;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}

.search-engines .label {
  padding: 6px 8px;
  border-bottom: 1px solid #ddd;
  font-size: 11px;
}

.search-engines .list {
  display: flex;
  align-items: center;
}

.search-engines .list a {
  flex: 0 0 60px;
  text-align: center;
  border-right: 1px solid #ddd;
  padding: 8px 0;
  cursor: pointer;
}

.search-engines .list a:hover {
  background: #eee;
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
const PREVIEW_REGEX = /(\+preview)/
function normalizeURL (str = '') {
  return str.replace(TRAILING_SLASH_REGEX, '').replace(PREVIEW_REGEX, '')
}

function makeSafe (str = '') {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

const DAT_KEY_REGEX = /([0-9a-f]{64})/ig
function toNiceUrl (str) {
  if (typeof str !== 'string') return str
  return str.replace(DAT_KEY_REGEX, (_, m) => `${m.slice(0, 6)}..${m.slice(-2)}`)
}

// helper for crawler search results
// - search results are returned from beaker's search APIs with nonces wrapping the highlighted sections
// - e.g. a search for "test" might return "the {500}test{/500} result"
// - in this case, we want to highlight at a more fine grain (the search terms)
// - so we strip the nonces and use the search terms for highlighting
function highlightSearchResult (searchTerms, nonce, result) {
  var start = new RegExp(`\\{${nonce}\\}`, 'g') // eg {500}
  var end = new RegExp(`\\{/${nonce}\\}`, 'g') // eg {/500}
  var termRe = new RegExp(`(${searchTerms.join('|')})`, 'gi') // eg '(beaker|browser)'
  const highlight = str => makeSafe(str).replace(start, '').replace(end, '').replace(termRe, (_, term) => `<strong>${term}</strong>`)

  if (result.record.type === 'site') {
    result.titleDecorated = highlight(result.title)
    result.descriptionDecorated = highlight(result.description)
  } else if (result.record.type === 'unwalled.garden/bookmark') {
    result.url = result.content.href
    result.titleDecorated = highlight(result.content.title)
    result.descriptionDecorated = ''
    if (result.content.description) result.descriptionDecorated += highlight(result.content.description)
    if (result.content.tags && result.content.tags.filter(Boolean).length) result.descriptionDecorated += `<span class="tags">(${highlight(result.content.tags.join(' '))})</span>`
  }
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
