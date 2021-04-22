/* globals customElements */
import * as rpc from 'pauls-electron-rpc'
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { unsafeHTML } from '../vendor/lit-element/lit-html/directives/unsafe-html'
import { makeSafe } from '../../lib/strings'
import browserManifest from '../../bg/web-apis/manifests/internal/browser'
import historyManifest from '../../bg/web-apis/manifests/internal/history'
import locationBarManifest from '../../bg/rpc-manifests/location-bar'
const bg = {
  beakerBrowser: rpc.importAPI('beaker-browser', browserManifest),
  history: rpc.importAPI('history', historyManifest),
  locationBar: rpc.importAPI('background-process-location-bar', locationBarManifest)
}

class LocationBar extends LitElement {
  static get properties () {
    return {
      results: {type: Array},
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
    window.setup = () => { document.body.style.opacity = 1; this.reset() }
    window.command = (command, opts) => this.onCommand(command, opts)
    window.invisibilityCloak = () => { document.body.style.opacity = 0 }
    // ^ this insane thing is how we give click events time to be handled in the UI
    // without it, the location input's blur event will remove our browserview too quickly
  }

  async fetchBrowserInfo () {
    // TODO - needed?
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
    this.query = ''
    this.results = []
    this.currentSelection = 0
    this.hoveredSearch = ''
  }

  selectResult (result) {
    if (!result) bg.locationBar.reload()
    else bg.locationBar.loadURL(result.url)
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
        <div class="autocomplete-results">
          ${repeat(this.results, (r, i) => this.renderAutocompleteResult(r, i))}
        </div>
        <div class="search-engines">
          <div class="label">
            ${this.hoveredSearch
              ? html`Search <strong>${this.hoveredSearch}</strong>`
              : html`Search for <strong>${this.query}</strong> with:`
            }
          </div>
          <div class="list">
            ${searchLink('Jolly', `beaker://desktop/?q=${encodeURIComponent(this.query)}`)}
            ${searchLink('Twitter', `https://twitter.com/search?q=${encodeURIComponent(this.query)}`)}
            ${searchLink('Reddit', `https://reddit.com/search?q=${encodeURIComponent(this.query)}`)}
            ${searchLink('GitHub', `https://github.com/search?q=${encodeURIComponent(this.query)}`)}
            ${searchLink('DuckDuckGo', `https://duckduckgo.com?q=${encodeURIComponent(this.query)}`)}
            ${searchLink('Google', `https://google.com/search?q=${encodeURIComponent(this.query)}`)}
            ${searchLink('YouTube', `https://www.youtube.com/results?search_query=${encodeURIComponent(this.query)}`)}
            ${searchLink('Wikipedia', `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(this.query)}`)}
            ${''/* TODO restore at some point esearchLink('Beaker', `beaker://search/?q=${encodeURIComponent(this.query)}`) */}
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
    if (r.isBookmark) {
      return html`
        <div class="icon"><i class="fas fa-star"></i></div>
        <div class="title">${r.titleDecorated ? unsafeHTML(joinSegments(r.titleDecorated)) : r.title}</div>
        <div class="spacer">&mdash;</div>
        <div class="provenance">${toNiceUrl(r.urlDecorated ? unsafeHTML(joinSegments(r.urlDecorated)) : r.url)}</div>
      `
    }
    return html`
      <div class="icon"><img src=${'asset:favicon-32:' + r.url}></div>
      <div class="title">${r.titleDecorated ? unsafeHTML(joinSegments(r.titleDecorated)) : r.title}</div>
      <div class="spacer">&mdash;</div>
      <div class="provenance">
        ${toNiceUrl(r.urlDecorated ? unsafeHTML(joinSegments(r.urlDecorated)) : r.url)}
      </div>
      ${r.origin ? html`
        <div class="origin">
          <span class="fa-fw ${r.origin.icon}"></span> ${r.origin.label}
        </div>
      ` : ''}
    `
  }

  // events
  // =

  onCommand (cmd, opts) {
    switch (cmd) {
      case 'show':
      case 'set-results':
        this.query = opts.query || ''
        this.currentSelection = this.query ? 0 : -1
        this.results = opts.results
        this.updateComplete.then(() => this.resize())
        break
      case 'hide':
        bg.locationBar.close()
        break
      case 'choose-selection':
        this.selectResult(this.results[this.currentSelection])
        break
      case 'move-selection':
        {
          if (opts.up && this.currentSelection > 0) { this.currentSelection = this.currentSelection - 1 }
          if (opts.down && this.currentSelection < this.results.length - 1) { this.currentSelection = this.currentSelection + 1 }
          let res = this.results[this.currentSelection]
          return res.search || res.url
        }
    }
  }

  onClickResult (e) {
    this.selectResult(this.results[e.currentTarget.dataset.resultIndex])
  }

  resize () {
    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.locationBar.resizeSelf({height})
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
  background: var(--bg-color--default);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  color: var(--text-color--default);
}

.autocomplete-results {
  max-height: 482px;
  overflow-y: auto;
  cursor: default;
  padding-top: 2px;
}

.result {
  display: flex;
  align-items: center;
  line-height: 20px;
  overflow: hidden;
  margin: 2px 4px;
  width: calc(100vw - 54px);
  border-radius: 4px;
  padding: 5px 12px;
}

.result .icon {
  flex: 0 0 28px;
}

.result .icon img {
  width: 16px;
  height: 16px;
}

.result .icon .fa,
.result .icon .fas,
.result .icon .far {
  font-size: 13px;
  color: var(--text-color--result-icon);
}

.result .icon .fa-arrow-right {
  margin-left: 1px;
}

.result .title,
.result .provenance,
.result .spacer,
.origin {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.result .title {
  color: var(--text-color--result-title);
  font-size: 14px;
  letter-spacing: 0.2px;
}

.result .spacer {
  margin: 0 5px;
}

.result .provenance {
  color: var(--text-color--result-provenance);
  font-size: 12px;
}

.result .origin {
  margin-left: 6px;
  color: var(--text-color--result-origin);
}

.result:hover {
  background: var(--bg-color--result--hover);
}

.result.selected {
  background: var(--bg-color--result--selected);
  color: #fff;
}

.result.selected .icon *,
.result.selected .title,
.result.selected .provenance,
.result.selected .origin {
  color: #fff;
}

.search-engines {
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
}

.search-engines .label {
  padding: 4px 18px;
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
  background: var(--bg-color--search-engine--hover);
}

.search-engines .list a img {
  width: 24px;
  height: 24px;
  image-rendering: -webkit-optimize-contrast;
}
`]

customElements.define('location-bar', LocationBar)

// internal methods
// =

const DRIVE_KEY_REGEX = /([0-9a-f]{64})/ig
function toNiceUrl (str) {
  if (typeof str !== 'string') return str
  return str.replace(DRIVE_KEY_REGEX, (_, m) => `${m.slice(0, 6)}..${m.slice(-2)}`)
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
  return toNiceUrl(str)
}
