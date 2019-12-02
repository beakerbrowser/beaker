import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { until } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/until.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import * as QP from 'beaker://app-stdlib/js/query-params.js'
import mainCSS from '../css/main.css.js'

export class CompareApp extends LitElement {
  static get properties () {
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
    this.selectedItem = undefined
    this.load()
  }

  async load () {
    this.baseArchive = new DatArchive(this.base)
    this.targetArchive = new DatArchive(this.target)
    this.baseInfo = await this.baseArchive.getInfo()
    this.targetInfo = await this.targetArchive.getInfo()
    this.basePath = (new URL(this.base)).pathname
    this.targetPath = (new URL(this.target)).pathname
    this.selectedItem = undefined
    this.requestUpdate()

    QP.setParams({
      base: this.base,
      target: this.target
    }, false, true)

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
    let lastDiffType = undefined
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <nav>
        ${!this.diff ? html`<div style="padding: 5px">Comparing...</div>` : ''}
        ${this.diff && !this.diff.length ? html`
          <div class="empty">No differences found.</div>
        ` : ''}
        ${repeat(this.diff || [], diff => {
          let heading = lastDiffType !== diff.change ? html`
            <h4>${({'add': 'Add', 'del': 'Delete', 'mod': 'Change'})[diff.change]}</h4>
          ` : ''
          lastDiffType = diff.change
          return html`
            ${heading}
            <compare-diff-item
              .diff=${diff}
              .leftOrigin=${this.targetArchive.url}
              .rightOrigin=${this.baseArchive.url}
              ?can-merge=${this.targetInfo.writable}
              ?selected=${this.selectedItem === diff}
              @select=${this.onSelectItem}
            ></compare-diff-item>
          `
        })}
      </nav>
      <main>
        <div class="header">
          <div class="title">
            Comparing
            <button @click=${this.onClickBase}>
              <span class="fas fa-fw fa-folder"></span>
              ${this.baseInfo.title} ${this.basePath}
              <span class="fas fa-fw fa-caret-down"></span>
            </button>
            to
            <button @click=${this.onClickTarget}>
              <span class="fas fa-fw fa-folder"></span>
              ${this.targetInfo.title} ${this.targetPath}
              <span class="fas fa-fw fa-caret-down"></span>
            </button>
          </div>
          <button class="transparent" @click=${this.onClickReverse}>
            <span class="fas fa-fw fa-sync"></span> Reverse
          </button>
          <div style="flex: 1"></div>
          ${this.targetInfo.writable ? html`
            <button class="primary" @click=${this.onClickMergeAll}>Merge all</button>
          ` : ''}
        </div>
        ${this.selectedItem ? html`
          <compare-diff-item-content
            .leftOrigin=${this.targetArchive.url}
            .rightOrigin=${this.baseArchive.url}
            .leftPath=${this.targetPath}
            .rightPath=${this.basePath}
            .diff=${this.selectedItem}
            @merge=${this.onClickMergeItem}
          ></compare-diff-item-content>
        ` : ''}
      </main>
    `
  }

  // events
  // =

  onClickBase (e) {
    e.preventDefault()
    e.stopPropagation()
    var rect = e.currentTarget.getClientRects()[0]
    contextMenu.create({
      x: rect.left,
      y: rect.bottom,
      left: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      noBorders: true,
      style: `padding: 4px 0`,
      items: [
        {
          icon: 'fas fa-fw fa-external-link-alt',
          label: 'Open in new tab',
          click: () => window.open(this.base)
        },
        {
          icon: 'far fa-fw fa-folder-open',
          label: 'Change folder',
          click: async () => {
            // TODO this modal needs to be in "select folder" mode
            let path = await navigator.selectFileDialog({
              archive: this.baseArchive.url,
              defaultPath: this.basePath,
              select: ['folder']
            })
            this.base = joinPath(this.baseArchive.url, path[0])
            this.load()
          }
        }
      ]
    })
  }

  onClickTarget (e) {
    e.preventDefault()
    e.stopPropagation()
    var rect = e.currentTarget.getClientRects()[0]
    contextMenu.create({
      x: rect.left,
      y: rect.bottom,
      left: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      noBorders: true,
      style: `padding: 4px 0`,
      items: [
        {
          icon: 'fas fa-fw fa-external-link-alt',
          label: 'Open in new tab',
          click: () => window.open(this.target)
        },
        {
          icon: 'far fa-fw fa-folder-open',
          label: 'Change folder',
          click: async () => {
            // TODO this modal needs to be in "select folder" mode
            let path = await navigator.selectFileDialog({
              archive: this.targetArchive.url,
              defaultPath: this.targetPath,
              select: ['folder']
            })
            this.target = joinPath(this.targetArchive.url, path[0])
            this.load()
          }
        }
      ]
    })
  }

  onSelectItem (e) {
    this.selectedItem = e.detail.diff
    this.requestUpdate()
  }

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
      diff: {type: Object},
      selected: {type: Boolean},
      canMerge: {type: Boolean, attribute: 'can-merge'}
    }
  }

  constructor () {
    super()
    this.diff = null
    this.selected = false
    this.canMerge = false
  }

  createRenderRoot () {
    return this // dont use shadow dom
  }

  render () {
    if (this.diff.type === 'dir') {
      return html`
        <div class="item ${this.diff.change} ${this.selected ? 'selected' : ''}" @click=${this.onSelect}>
          <div class="revision-indicator ${this.diff.change}"></div>
          <div class="icon"><span class="fas fa-fw fa-folder"></span></div>
          <div class="path">${this.diff.path}</div>
        </div>
      `
    }
    return html`
      <div class="item ${this.diff.change} ${this.selected ? 'selected' : ''}" @click=${this.onSelect}>
        <div class="revision-indicator ${this.diff.change}"></div>
        <div class="icon"><span class="fas fa-fw fa-file"></span></div>
        <div class="path">${this.diff.path}</div>
      </div>
    `
  }

  async onSelect () {
    emit(this, 'select', {detail: {diff: this.diff}})
  }
}

class CompareDiffItemContent extends LitElement {
  static get properties () {
    return {
      leftOrigin: {type: String},
      rightOrigin: {type: String},
      leftPath: {type: String},
      rightPath: {type: String},
      diff: {type: Object},
      leftText: {type: String},
      rightText: {type: String}
    }
  }

  get leftUrl () {
    return joinPath(this.leftOrigin, this.leftPath, this.diff.path)
  }

  get rightUrl () {
    return joinPath(this.rightOrigin, this.rightPath, this.diff.path)
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
  }

  createRenderRoot () {
    return this // dont use shadow dom
  }

  async renderLeftText () {
    var left = new DatArchive(this.leftOrigin)
    if (this.diff.change === 'del' || this.diff.change === 'mod') {
      return left.readFile(joinPath(this.leftPath, this.diff.path))
    }
    return ''
  }

  async renderRightText () {
    var right = new DatArchive(this.rightOrigin)
    if (this.diff.change === 'add' || this.diff.change === 'mod') {
      return right.readFile(joinPath(this.rightPath, this.diff.path))
    }
    return ''
  }
  
  render () {
    return html`
      <div class="info">
        <span class="path">${this.diff.path}</span>
        <button class="transparent" @click=${this.onClickMerge}>Merge</button>
      </div>
      ${this.renderContainer()}
    `
  }

  renderContainer () {
    if (this.diff.change === 'mod') {
      return html`
        <div class="container split">
          <div><div class="action">From</div><div class="wrap">${this.renderLeft()}</div></div>
          <div><div class="action">To</div><div class="wrap">${this.renderRight()}</div></div>
        </div>
      `
    } else if (this.diff.change === 'add') {
      return html`<div class="container"><div><div class="action">Add</div><div class="wrap">${this.renderRight()}</div></div></div>`
    } else if (this.diff.change === 'del') {
      return html`<div class="container"><div><div class="action">Delete</div><div class="wrap">${this.renderLeft()}</div></div></div>`
    }
  }

  renderLeft () {
    if (this.diff.type !== 'file') return html`<span class="fas fa-fw fa-folder"></span> Directory`
    if (this.isImage) return html`<img src=${this.leftUrl}>`
    if (this.isVideo) return html`<video controls><source src=${this.leftUrl}></video>`
    if (this.isAudio) return html`<audio controls><source src=${this.leftUrl}></audio>`
    if (this.isText) return html`<div class="text">${until(this.renderLeftText(), 'Loading...')}</div>`
  }

  renderRight () {
    if (this.diff.type !== 'file') return html`<span class="fas fa-fw fa-folder"></span> Directory`
    if (this.isImage) return html`<img src=${this.rightUrl}>`
    if (this.isVideo) return html`<video controls><source src=${this.rightUrl}></video>`
    if (this.isAudio) return html`<audio controls><source src=${this.rightUrl}></audio>`
    if (this.isText) return html`<div class="text">${until(this.renderRightText(), 'Loading...')}</div>`
  }

  onClickMerge (e) {
    e.preventDefault()
    e.stopPropagation()
    emit(this, 'merge', {detail: {diff: this.diff}, bubbles: true})
  }
}

customElements.define('compare-app', CompareApp)
customElements.define('compare-diff-item', CompareDiffItem)
customElements.define('compare-diff-item-content', CompareDiffItemContent)
