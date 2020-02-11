import {LitElement, html} from '../../vendor/lit-element/lit-element.js'
import {repeat} from '../../vendor/lit-element/lit-html/directives/repeat.js'
import {classMap} from '../../vendor/lit-element/lit-html/directives/class-map.js'
import * as QP from '../lib/query-params.js'
import searchInputCSS from '../../css/com/search-input.css.js'

export class SearchInput extends LitElement {
  static get properties () {
    return {
      placeholder: {type: String},
      isFocused: {type: Boolean},
      query: {type: String},
      highlighted: {type: Number}
    }
  }

  static get styles () {
    return searchInputCSS
  }

  constructor () {
    super()
    this.placeholder = ''
    this.isFocused = false
    this.query = QP.getParam('q', undefined)
    this.results = undefined
    this.highlighted = 0

    this.$onClickDocument = this.onClickDocument.bind(this)
  }

  get value () {
    return this.query
  }

  generateResults () {
    if (this.query) {
      const title = (typeLabel) => `${!this.query ? 'List all' : 'Search'} ${typeLabel}${this.query ? ` for "${this.query}"` : ''}`
      const url = (driveType) => `/search?drive-type=${encodeURIComponent(driveType)}&q=${encodeURIComponent(this.query)}`
      this.results = [
        {title: title('this group'), url: url('')}
      ]
    } else {
      this.results = undefined
    }
    // this.results = [
    //   {title: title('posts'), url: url('')},
    //   {title: title('users'), url: url('user')},
    //   {title: title('themes'), url: url('theme')},
    //   {title: title('modules'), url: url('module')},
    //   {title: title('webterm commands'), url: url('webterm.sh/cmd-pkg')}
    // ]
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      <div class="search-container ${this.isFocused ? 'active' : ''}">
        <i class="fas fa-search"></i>
        <input
          type="text"
          class="search"
          placeholder="${this.placeholder}"
          value="${this.query}"
          @keydown=${this.onKeydownInput}
          @keyup=${this.onKeyupInput}
          @focus=${this.onFocusInput}
        >
        ${this.renderResults()}
      </div>
    `
  }

  renderResults () {
    if (!this.results || !this.isFocused) {
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
        ${''/*<img class="icon favicon" src="beaker-favicon:32,${res.url}"/>*/}
        <span class="title">${res.title}</span>
      </a>
    `
  }

  // events
  // =

  select (url, title) {
    window.location = url
    // this.shadowRoot.querySelector('input').value = this.query = url
    // this.unfocus()
    // this.dispatchEvent(new CustomEvent('selection-changed', {detail: {title}}))
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
    if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
      e.preventDefault()
      this.highlighted = Math.max(this.highlighted - 1, 0)
    }
    if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
      e.preventDefault()
      this.highlighted = Math.min(this.highlighted + 1, this.results.length - 1)
    }
  }

  onKeyupInput (e) {
    if (this.query !== e.currentTarget.value) {
      this.query = e.currentTarget.value
      this.generateResults()
    }
  }

  onFocusInput (e) {
    this.isFocused = true
    this.generateResults()
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

customElements.define('beaker-search-input', SearchInput)