import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { until } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/until.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import { pluralize, toNiceDomain } from 'beaker://app-stdlib/js/strings.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import * as QP from 'beaker://app-stdlib/js/query-params.js'
import * as compare from './lib/compare.js'

export class CompareApp extends LitElement {
  static get properties () {
    return {
      base: {type: String},
      target: {type: String}
    }
  }

  constructor () {
    super()
    this.base = QP.getParam('base')
    this.target = QP.getParam('target')
    this.selectedItem = undefined
    this.checkedItems = []
    this.load()
  }

  createRenderRoot () {
    return this // dont use shadow dom
  }

  async load () {
    this.baseDrive = this.base ? new Hyperdrive(this.base) : undefined
    this.targetDrive = this.target ? new Hyperdrive(this.target) : undefined
    this.baseInfo = await this.baseDrive?.getInfo?.().catch(e => undefined)
    this.targetInfo = await this.targetDrive?.getInfo?.().catch(e => undefined)
    this.basePath = getUrlPathname(this.base)
    this.targetPath = getUrlPathname(this.target)
    this.checkedItems = []
    this.selectedItem = undefined
    this.requestUpdate()

    QP.setParams({
      base: this.base,
      target: this.target
    }, false, true)

    if (this.baseInfo && this.targetInfo) {
      const filter = path => path !== '/index.json'
      this.diff = await compare.diff(this.baseDrive, this.basePath, this.targetDrive, this.targetPath, {compareContent: true, shallow: false, filter})
    } else {
      this.diff = []
    }
    this.checkedItems = this.diff.slice()
    console.log(this.diff)
    this.requestUpdate()
  }

  async doMerge (diff) {
    try {
      toast.create('Merging...')
      await compare.applyRight(this.baseDrive, this.targetDrive, diff)
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
    let lastDiffType = undefined
    const diffSortFn = (a, b) => (a.change).localeCompare(b.change) || (a.path || '').localeCompare(b.path || '')
    var numChecked = this.checkedItems?.length === this.diff?.length
      ? 'all changes'
      : `${this.checkedItems?.length} ${pluralize(this.checkedItems?.length, 'change')}`
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <header>
        <h1>Diff / Merge Tool</h1>
        <div class="toolbar">
          <div class="title">
            Comparing
            <button @click=${this.onClickBase}>
              ${this.baseInfo?.title} ${this.basePath}
              <span class="fas fa-fw fa-caret-down"></span>
            </button>
            to
            <button @click=${this.onClickTarget}>
              ${this.targetInfo?.title} ${this.targetPath}
              <span class="fas fa-fw fa-caret-down"></span>
            </button>
          </div>
          <button class="transparent" @click=${this.onClickReverse}>
            <span class="fas fa-fw fa-sync"></span> Reverse
          </button>
          <div style="flex: 1"></div>
          ${this.targetInfo?.writable ? html`
            <button class="primary" ?disabled=${this.checkedItems?.length === 0} @click=${this.onClickBulkMerge}>Merge ${numChecked}</button>
          ` : ''}
        </div>
      </header>
      <div class="layout">
        <nav>
          <div class="nav-header">
            <label><input type="checkbox" @change=${this.onToggleAllChecked}> Select / Deselect All</label>
          </div>
          ${!this.diff ? html`<div style="padding: 5px">Comparing...</div>` : ''}
          ${this.diff && !this.diff.length ? html`
            <div class="empty">No differences found.</div>
          ` : ''}
          ${repeat((this.diff || []).slice().sort(diffSortFn), diff => {
            let heading = lastDiffType !== diff.change ? html`
              <h4>${({'add': 'Add', 'del': 'Delete', 'mod': 'Change'})[diff.change]}</h4>
            ` : ''
            lastDiffType = diff.change
            return html`
              ${heading}
              <compare-diff-item
                .diff=${diff}
                .rightPath=${this.targetPath}
                ?can-merge=${this.targetInfo?.writable}
                ?selected=${this.selectedItem === diff}
                ?checked=${this.checkedItems.includes(diff)}
                @select=${this.onSelectItem}
                @check=${this.onCheckItem}
              ></compare-diff-item>
            `
          })}
        </nav>
        <main>
          ${this.selectedItem ? html`
            <compare-diff-item-content
              .leftOrigin=${this.baseDrive.url}
              .rightOrigin=${this.targetDrive.url}
              .leftPath=${this.basePath}
              .rightPath=${this.targetPath}
              .diff=${this.selectedItem}
              @merge=${this.onClickMergeItem}
            ></compare-diff-item-content>
          ` : ''}
        </main>
      </div>
    `
  }

  updated () {
    var allToggle = this.querySelector('.nav-header input')
    var checked = this.diff?.length > 0 && this.checkedItems?.length === this.diff?.length
    allToggle.checked = checked
    allToggle.indeterminate = !checked && this.checkedItems?.length > 0
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
            let sel = await navigator.selectFileDialog({
              drive: this.baseDrive?.url,
              defaultPath: this.basePath,
              select: ['folder']
            })
            this.base = sel[0].url
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
            let sel = await navigator.selectFileDialog({
              drive: this.targetDrive?.url,
              defaultPath: this.targetPath,
              select: ['folder']
            })
            this.target = sel[0].url
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

  onCheckItem (e) {
    var {diff} = e.detail
    if (!this.checkedItems.includes(diff)) {
      this.checkedItems.push(diff)
    } else {
      this.checkedItems.splice(this.checkedItems.indexOf(diff), 1)
    }
    this.requestUpdate()
  }

  onToggleAllChecked (e) {
    if (this.checkedItems.length === this.diff.length) {
      this.checkedItems.length = 0
    } else {
      this.checkedItems = this.diff.slice()
    }
    console.log(this.checkedItems)
    this.requestUpdate()
  }

  onClickMergeItem (e) {
    if (!confirm('Merge change?')) return
    var {diff} = e.detail
    this.doMerge([diff])
  }

  onClickReverse (e) {
    [this.base, this.target] = [this.target, this.base]
    this.load()
  }

  onClickBulkMerge (e) {
    if (!confirm('Merge selected changes?')) return
    this.doMerge(this.checkedItems)
  }
}

class CompareDiffItem extends LitElement {
  static get properties () {
    return {
      diff: {type: Object},
      selected: {type: Boolean},
      checked: {type: Boolean},
      rightPath: {type: String},
      canMerge: {type: Boolean, attribute: 'can-merge'}
    }
  }

  constructor () {
    super()
    this.diff = null
    this.checked = false
    this.canMerge = false
  }

  createRenderRoot () {
    return this // dont use shadow dom
  }

  render () {
    var icon = 'file'
    if (this.diff.type === 'mount') icon = 'external-link-square-alt'
    if (this.diff.type === 'dir') icon = 'folder'
    return html`
      <div class="item ${this.diff.change} ${this.selected ? 'selected' : ''}" @click=${this.onSelect}>
        <input type="checkbox" @click=${this.onCheck}>
        <div class="revision-indicator ${this.diff.change}"></div>
        <div class="icon"><span class="fas fa-fw fa-${icon}"></span></div>
        <div class="path">${relativePath(this.rightPath, this.diff.rightPath)}</div>
      </div>
    `
  }

  updated () {
    this.querySelector('input').checked = this.checked
  }

  onCheck (e) {
    emit(this, 'check', {detail: {diff: this.diff}})
  }

  onSelect () {
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

  constructor () {
    super()
    this.leftOrigin = null
    this.rightOrigin = null
    this.diff = null
  }

  createRenderRoot () {
    return this // dont use shadow dom
  }

  renderLeftColumn () {
    if (this.diff.change === 'del' || this.diff.change === 'mod') {
      return this.renderFileContent(new Hyperdrive(this.rightOrigin), this.diff.rightPath, this.diff.rightMountKey)
    }
    return ''
  }

  renderRightColumn () {
    var right = new Hyperdrive(this.rightOrigin)
    if (this.diff.change === 'add' || this.diff.change === 'mod') {
      return this.renderFileContent(new Hyperdrive(this.leftOrigin), this.diff.leftPath, this.diff.leftMountKey)
    }
    return ''
  }

  renderFileContent (drive, path, mountKey) {
    if (this.diff.type === 'mount') {
      return html`
        <span class="fas fa-fw fa-external-link-square-alt"></span>
        Mount to <a href="drive://${mountKey}" target="_blank">${toNiceDomain(mountKey)}</a>
      `
    }
    if (this.diff.type === 'dir') return html`<span class="fas fa-fw fa-folder"></span> Directory`
    if (/\.(png|jpe?g|gif)$/.test(path)) {
      return html`<img src=${drive.url + path}>`
    }
    if (/\.(mp4|webm|mov)$/.test(path)) {
      return html`<video controls><source src=${drive.url + path}></video>`
    }
    if (/\.(mp3|ogg)$/.test(path)) {
      return html`<audio controls><source src=${drive.url + path}></audio>`
    }
    return html`<div class="text">${until(drive.readFile(path), 'Loading...')}`
  }
  
  render () {
    return html`
      <div class="info">
        <span class="path">
          <div class="revision-indicator ${this.diff.change}"></div>
          ${this.diff.change === 'add' ? 'Add' : ''}
          ${this.diff.change === 'del' ? 'Delete' : ''}
          ${this.diff.change === 'mod' ? 'Change' : ''}
          ${this.diff.rightPath}
        </span>
        <button class="transparent" @click=${this.onClickMerge}>Merge</button>
      </div>
      ${this.renderContainer()}
    `
  }

  renderContainer () {
    if (this.diff.change === 'mod') {
      return html`
        <div class="container split">
          <div><div class="action">From</div><div class="wrap">${this.renderLeftColumn()}</div></div>
          <div><div class="action">To</div><div class="wrap">${this.renderRightColumn()}</div></div>
        </div>
      `
    } else if (this.diff.change === 'add') {
      return html`<div class="container"><div><div class="wrap">${this.renderRightColumn()}</div></div></div>`
    } else if (this.diff.change === 'del') {
      return html`<div class="container"><div><div class="wrap">${this.renderLeftColumn()}</div></div></div>`
    }
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

function relativePath (basePath, fullPath) {
  if (fullPath.startsWith(basePath)) {
    return fullPath.slice(basePath.length)
  }
  return fullPath
}

function getUrlPathname (url) {
  try {
    return (new URL(url)).pathname
  } catch (e) {
    return ''
  }
}