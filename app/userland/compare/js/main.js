import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as QP from 'beaker://app-stdlib/js/query-params.js'
import mainCSS from '../css/main.css.js'

export class CompareApp extends LitElement {
  static get properties() {
    return { 
      base: {type: String},
      target: {type: String}
    }
  }

  static get styles () {
    return mainCSS
  }

  constructor () {
    super()
    this.base = QP.getParam('base')
    this.target = QP.getParam('target')
    this.load()
  }

  async load () {
    this.baseArchive = new DatArchive(this.base)
    this.targetArchive = new DatArchive(this.target)
    this.baseInfo = await this.baseArchive.getInfo()
    this.targetInfo = await this.targetArchive.getInfo()
    this.requestUpdate()

    this.diff = await DatArchive.diff(this.base, this.target, {compareContent: true, shallow: false})
    this.diff.sort((a, b) => (a.change).localeCompare(b.change) || (a.path || '').localeCompare(b.path || ''))
    console.log(this.diff)
    this.requestUpdate()
  }

  async doMerge (opts) {
    try {
      toast.create('Merging...')
      await DatArchive.merge(this.baseArchive, this.targetArchive, opts)
      toast.create('Files updated', 'success')
    } catch (e) {
      console.error(e)
      toast.create(e.message || 'There was an issue writing the files', 'error')
    }
    this.load()
  }

  // rendering
  // =

  render () {
    if (!this.baseInfo || !this.targetInfo) return html``
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <div class="header">
        <div class="title">
          Comparing
          <a href=${this.base}>${this.baseInfo.title}</a>
          to
          <a href=${this.target}>${this.targetInfo.title}</a>
        </div>
        <button @click=${this.onClickReverse}>
          <span class="fas fa-fw fa-sync"></span> Reverse
        </button>
        <div style="flex: 1"></div>
        ${this.targetInfo.isOwner ? html`
          <button class="primary" @click=${this.onClickMergeAll}>Merge all</button>
        ` : ''}
      </div>
      ${!this.diff ? html`<div style="padding: 5px">Comparing...</div>` : ''}
      ${this.diff ? repeat(this.diff, diff => html`
        <compare-diff-item
          .diff=${diff}
          .leftOrigin=${this.target}
          .rightOrigin=${this.base}
          ?can-merge=${this.targetInfo.isOwner}
          @merge=${this.onClickMergeItem}
        ></compare-diff-item>
      `) : ''}
      ${this.diff && !this.diff.length ? html`
        <div class="empty">No differences found.</div>
      ` : ''}
    `    
  }

  // events
  // =

  onClickMergeItem (e) {
    if (!confirm('Merge change?')) return
    var {diff} = e.detail
    this.doMerge({
      shallow: false,
      paths: [diff.path + (diff.type === 'dir' ? '/' : '')] // trailing slash indicates directory
    })
  }

  onClickReverse (e) {
    [this.base, this.target] = [this.target, this.base]
    this.load()
  }

  onClickMergeAll (e) {
    if (!confirm('Merge all changes?')) return
    this.doMerge({shallow: false})
  }
}

class CompareDiffItem extends LitElement {
  static get properties () {
    return {
      leftOrigin: {type: String},
      rightOrigin: {type: String},
      diff: {type: Object},
      canMerge: {type: Boolean, attribute: 'can-merge'},
      isExpanded: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.leftOrigin = null
    this.leftRight = null
    this.diff = null
    this.canMerge = false
    this.isExpanded = false
  }

  createRenderRoot() {
    return this // dont use shadow dom
  }

  render () {
    if (this.diff.type === 'dir') {
      return html`
        <div class="item ${this.diff.change}" @click=${this.onToggleExpanded}>
          <span style="width: 1.25em"></span>
          <div class="revision-indicator ${this.diff.change}"></div>
          <div class="revision">${this.diff.change}</div>
          <div class="path">${this.diff.path}</div>
          <div style="flex: 1"></div>
          ${this.canMerge ? html`
            <button class="transparent" @click=${this.onClickMerge}>Merge</button>
          ` : ''}
        </div>
      `
    }
    return html`
      <div class="item clickable ${this.diff.change}" @click=${this.onToggleExpanded}>
        <span class="fas fa-fw fa-${this.isExpanded ? 'minus' : 'plus'}"></span>
        <div class="revision-indicator ${this.diff.change}"></div>
        <div class="revision">${this.diff.change}</div>
        <div class="path">${this.diff.path}</div>
        <div style="flex: 1"></div>
        ${this.canMerge ? html`
          <button class="transparent" @click=${this.onClickMerge}>Merge</button>
        ` : ''}
      </div>
      ${this.isExpanded ? html`
        <compare-diff-item-content
          .leftOrigin=${this.leftOrigin}
          .rightOrigin=${this.rightOrigin}
          .diff=${this.diff}
        ></compare-diff-item-content>
      ` : ''}
    `
  }

  async onToggleExpanded () {
    this.isExpanded = !this.isExpanded
    if (this.isExpanded) {
      await this.requestUpdate()
      this.querySelector('compare-diff-item-content').load()
    }
  }

  onClickMerge (e) {
    e.preventDefault()
    e.stopPropagation()
    emit(this, 'merge', {detail: {diff: this.diff}, bubbles: true})
  }
}

class CompareDiffItemContent extends LitElement {
  static get properties () {
    return {
      leftOrigin: {type: String},
      rightOrigin: {type: String},
      diff: {type: Object},
      leftText: {type: String},
      rightText: {type: String}
    }
  }

  get leftUrl () {
    return this.leftOrigin + this.diff.path
  }
  
  get rightUrl () {
    return this.rightOrigin + this.diff.path
  }

  get isImage () {
    return /\.(png|jpe?g|gif)$/i.test(this.diff.path)
  }

  get isVideo () {
    return /\.(mp4|webm|mov)$/i.test(this.diff.path)
  }

  get isAudio () {
    return /\.(mp3|ogg)$/i.test(this.diff.path)
  }

  get isText () {
    return !this.isImage && !this.isVideo && !this.isAudio
  }

  constructor () {
    super()
    this.leftOrigin = null
    this.rightOrigin = null
    this.diff = null
    this.leftText = null
    this.rightText = null
  }

  createRenderRoot() {
    return this // dont use shadow dom
  }

  async load () {
    if (this.isText) {
      var left = new DatArchive(this.leftOrigin)
      var right = new DatArchive(this.rightOrigin)
      if (this.diff.change === 'del' || this.diff.change === 'mod') {
        this.leftText = await left.readFile(this.diff.path)
      }
      if (this.diff.change === 'add' || this.diff.change === 'mod') {
        this.rightText = await right.readFile(this.diff.path)
      }
    }
  }

  render () {
    if (this.diff.change === 'mod') {
      return html`
        <div class="container split">
          <div><div class="action">Delete</div>${this.renderLeft()}</div>
          <div><div class="action">Add</div>${this.renderRight()}</div>
        </div>
      `
    } else if (this.diff.change === 'add') {
      return html`<div class="container"><div><div class="action">Add</div>${this.renderRight()}</div></div>`
    } else if (this.diff.change === 'del') {
      return html`<div class="container"><div><div class="action">Delete</div>${this.renderLeft()}</div></div>`
    }
  }

  renderLeft () {
    if (this.isImage) return html`<img src=${this.leftUrl}>`
    if (this.isVideo) return html`<video controls><source src=${this.leftUrl}></video>`
    if (this.isAudio) return html`<audio controls><source src=${this.leftUrl}></audio>`
    return html`<div class="text">${this.leftText}</div>`
  }

  renderRight () {
    if (this.isImage) return html`<img src=${this.rightUrl}>`
    if (this.isVideo) return html`<video controls><source src=${this.rightUrl}></video>`
    if (this.isAudio) return html`<audio controls><source src=${this.rightUrl}></audio>`
    return html`<div class="text">${this.rightText}</div>`
  }

  onToggleExpanded () {
    this.isExpanded = !this.isExpanded
  }
}

customElements.define('compare-app', CompareApp)
customElements.define('compare-diff-item', CompareDiffItem)
customElements.define('compare-diff-item-content', CompareDiffItemContent)
