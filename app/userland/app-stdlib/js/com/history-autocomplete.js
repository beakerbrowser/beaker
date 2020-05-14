import {LitElement, html} from '../../vendor/lit-element/lit-element.js'
import {repeat} from '../../vendor/lit-element/lit-html/directives/repeat.js'
import {classMap} from '../../vendor/lit-element/lit-html/directives/class-map.js'
import {toDomain, highlightSearchResult} from '../strings.js'
import historyAutocompleteCSS from '../../css/com/history-autocomplete.css.js'

export class HistoryAutocomplete extends LitElement {
  static get properties () {
    return {
      fontawesomeSrc: {type: String, attribute: 'fontawesome-src'},
      placeholder: {type: String},
      isFocused: {type: Boolean},
      query: {type: String},
      results: {type: Array},
      highlighted: {type: Number},
      includeVerbatim: {type: Boolean, attribute: 'include-verbatim'}
    }
  }

  constructor () {
    super()
    this.fontawesomeSrc = ''
    this.placeholder = ''
    this.isFocused = false
    this.query = ''
    this.results = null
    this.highlighted = 0
    this.includeVerbatim = false

    this.$onClickDocument = this.onClickDocument.bind(this)
  }

  async runQuery () {
    var queryAtTimeOfRun = this.query
    var res = this.query ? await beaker.history.search(this.query) : []
    console.log(res)

    if (queryAtTimeOfRun !== this.query) {
      // user changed query while we were running, discard
      console.log('Discarding results from outdated query')
      return
    }

    if (this.includeVerbatim) {
      res = [{url: this.query, title: ''}].concat(res)
    }

    this.highlighted = 0
    this.results = res
  }

  get value () {
    return this.query
  }

  // rendering
  // =

  render () {
    return html`
      <div class="search-container">
        <input
          type="text"
          class="search"
          placeholder="${this.placeholder}"
          value="${this.query}"
          autofocus
          @keydown=${this.onKeydownInput}
          @keyup=${this.onKeyupInput}
          @focus=${this.onFocusInput}
        >
        ${this.renderResults()}
      </div>
    `
  }

  renderResults () {
    if (!this.results || !this.isFocused || this.results.length === 0) {
      return ''
    }
    return html`
      <div class="search-results autocomplete-results">
        ${repeat(this.results, (res, i) => this.renderResult(res, i))}
      </div>
    `
  }

  renderResult (res, i) {
    const cls = classMap({
      'autocomplete-result': true,
      'search-result': true,
      active: i === this.highlighted
    })
    return html`
      <a href="${res.url}" class="${cls}" @click=${this.onClickResult}>
        <img class="icon favicon" src="asset:favicon:32,${res.url}"/>
        <span class="title">${res.title}</span>
        <span class="label">${res.url}</span>
      </a>
    `
  }

  // events
  // =

  select (url, title) {
    this.shadowRoot.querySelector('input').value = this.query = url
    this.unfocus()
    this.dispatchEvent(new CustomEvent('selection-changed', {detail: {title}}))
  }

  unfocus () {
    this.isFocused = false

    var input = this.shadowRoot.querySelector('input')
    if (input.matches(':focus')) {
      input.blur()
    }

    document.removeEventListener('click', this.$onClickDocument)
  }

  onClickResult (e) {
    e.preventDefault()
    this.select(e.currentTarget.getAttribute('href'), e.currentTarget.getAttribute('title'))
  }

  onKeydownInput (e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()

      let res = this.results[this.highlighted]
      if (res) {
        this.select(res.url, res.title)
      }
      return
    }
    if (e.key === 'Escape') {
      return this.unfocus()
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.highlighted = Math.max(this.highlighted - 1, 0)
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.highlighted = Math.min(this.highlighted + 1, this.results.length)
    }
  }

  onKeyupInput (e) {
    if (this.query !== e.currentTarget.value) {
      this.query = e.currentTarget.value
      this.runQuery()
    }
  }

  onFocusInput (e) {
    this.isFocused = true
    document.addEventListener('click', this.$onClickDocument)
  }

  onClickDocument (e) {
    // is the click inside us?
    for (let el of e.path) {
      if (el === this) return
    }
    // no, unfocus
    this.unfocus()
  }
}
HistoryAutocomplete.styles = historyAutocompleteCSS

customElements.define('beaker-history-autocomplete', HistoryAutocomplete)