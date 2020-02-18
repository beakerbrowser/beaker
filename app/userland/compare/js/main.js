import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { until } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/until.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import { pluralize, toNiceDomain } from 'beaker://app-stdlib/js/strings.js'
import { isFilenameBinary } from 'beaker://app-stdlib/js/is-ext-binary.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import * as QP from 'beaker://app-stdlib/js/query-params.js'
import * as compare from './lib/compare.js'

var isMonacoLoaded = false

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
    this.otherDrives = undefined
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
    this.basePath = '/' //getUrlPathname(this.base)
    this.targetPath = '/' // getUrlPathname(this.target)
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
    console.log(this.diff)
    this.requestUpdate()

    if (!isMonacoLoaded) {
      await new Promise((resolve, reject) => {
        window.require.config({ baseUrl: 'beaker://assets/' })
        window.require(['vs/editor/editor.main'], () => {
          isMonacoLoaded = true
          resolve()
        })
      })
    }

    if (!this.otherDrives) {
      this.otherDrives = await beaker.drives.list({includeSystem: false})
    }
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
    var counts = {
      additions: this.diff?.filter?.(d => d.change === 'add')?.length,
      modifications: this.diff?.filter?.(d => d.change === 'mod')?.length,
      deletions: this.diff?.filter?.(d => d.change === 'del')?.length
    }
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <header>
        <h1>Diff / Merge Tool</h1>
        <div class="toolbar">
          <div class="title">
            Merging
            <button @click=${this.onClickBase}>
              ${this.baseInfo?.title}
              <span class="fas fa-fw fa-caret-down"></span>
            </button>
            into
            <button @click=${this.onClickTarget}>
              ${this.targetInfo?.title}
              <span class="fas fa-fw fa-caret-down"></span>
            </button>
          </div>
          <button class="transparent" @click=${this.onClickReverse}>
            <span class="fas fa-fw fa-sync"></span> Reverse
          </button>
          ${this.targetInfo?.writable ? html`
            <button class="primary" ?disabled=${this.checkedItems?.length === 0} @click=${this.onClickBulkMerge}>Merge ${numChecked}</button>
            ` : html`
            <button class="primary" disabled data-tooltip="Can't merge into a drive you don't own">Merge ${numChecked}</button>
          `}
        </div>
      </header>
      <div class="layout">
        <nav @click=${this.onClickOutside}>
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
                .targetPath=${this.targetPath}
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
              .baseOrigin=${this.baseDrive.url}
              .targetOrigin=${this.targetDrive.url}
              .basePath=${this.basePath}
              .targetPath=${this.targetPath}
              .diff=${this.selectedItem}
              ?can-merge=${this.targetInfo?.writable}
              @merge=${this.onClickMergeItem}
            ></compare-diff-item-content>
          ` : html`
            <div class="summary">
              <h2>${this.diff?.length} ${pluralize(this.diff?.length, 'Difference')} Found</h2>
              <div><span class="revision-indicator add"></span> ${counts.additions} ${pluralize(counts.additions, 'addition')}</div>
              <div><span class="revision-indicator mod"></span> ${counts.modifications} ${pluralize(counts.modifications, 'modification')}</div>
              <div><span class="revision-indicator del"></span> ${counts.deletions} ${pluralize(counts.deletions, 'deletion')}</div>
              <p>
                Merging
                ${this.baseInfo ? html`
                  <a href="${this.baseInfo.url}" target="_blank">${this.baseInfo.title || 'Base'}</a>
                ` : '?'}
                into
                ${this.targetInfo ? html`
                  <a href="${this.targetInfo.url}" target="_blank">${this.targetInfo.title || 'Target'}</a>
                ` : '?'}
              </p>
            </div>
          `}
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

  onClickOutside (e) {
    for (let el of e.path) {
      if (el && el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'COMPARE-DIFF-ITEM') {
        return
      }
    }
    this.selectedItem = undefined
    this.requestUpdate()
  }

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
      items: this.otherDrives.slice(0, 10).map(drive => ({
        icon: false,
        label: drive.info.title,
        click: () => {
          this.base = drive.url
          this.load()
        }
      })).concat([
        '-',
        {
          icon: 'far fa-fw fa-hdd',
          label: 'Browse...',
          click: async () => {
            this.base = await navigator.selectDriveDialog()
            this.load()
          }
        }
      ])
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
      items: this.otherDrives.slice(0, 10).map(drive => ({
        icon: false,
        label: drive.info.title,
        click: () => {
          this.target = drive.url
          this.load()
        }
      })).concat([
        '-',
        {
          icon: 'far fa-fw fa-hdd',
          label: 'Browse...',
          click: async () => {
            this.target = await navigator.selectDriveDialog()
            this.load()
          }
        }
      ])
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
      targetPath: {type: String}
    }
  }

  constructor () {
    super()
    this.diff = null
    this.checked = false
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
        <div class="path">${relativePath(this.targetPath, this.diff.targetPath)}</div>
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
      baseOrigin: {type: String},
      targetOrigin: {type: String},
      canMerge: {type: Boolean, attribute: 'can-merge'},
      diff: {type: Object}
    }
  }

  constructor () {
    super()
    this.baseOrigin = null
    this.targetOrigin = null
    this.canMerge = false
    this.diff = null
  }

  createRenderRoot () {
    return this // dont use shadow dom
  }
  
  render () {
    return html`
      <div class="info">
        <span class="path">
          <div class="revision-indicator ${this.diff.change}"></div>
          ${this.diff.change === 'add' ? 'Add' : ''}
          ${this.diff.change === 'del' ? 'Delete' : ''}
          ${this.diff.change === 'mod' ? 'Change' : ''}
          ${this.diff.targetPath}
        </span>
        ${this.canMerge ? html`
          <button @click=${this.onClickMerge}>Merge</button>
        ` : html`
          <button disabled data-tooltip="Can't merge into a drive you don't own">Merge</button>
        `}
        ${['del', 'mod'].includes(this.diff.change) ? html`
          <a href="${this.targetOrigin}${this.diff?.targetPath}" target="_blank"><span class="fas fa-fw fa-external-link-alt"></span> View current</a>
        ` : ''}
        ${['add', 'mod'].includes(this.diff.change) ? html`
          <a href="${this.baseOrigin}${this.diff?.basePath}" target="_blank"><span class="fas fa-fw fa-external-link-alt"></span> View new file</a>
        ` : ''}
      </div>
      ${this.renderDiff()}
    `
  }

  renderDiff () {
    if (this.diff.type === 'mount' || this.diff.type === 'dir' || isFilenameBinary(this.diff?.basePath || this.diff?.targetPath)) {
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
    } else if (this.diff) {
      return html`<div class="editor"></div>`
    }
  }

  renderLeftColumn () {
    if (this.diff.change === 'del' || this.diff.change === 'mod') {
      return this.renderFileContent(new Hyperdrive(this.targetOrigin), this.diff.targetPath, this.diff.targetMountKey)
    }
    return ''
  }

  renderRightColumn () {
    if (this.diff.change === 'add' || this.diff.change === 'mod') {
      return this.renderFileContent(new Hyperdrive(this.baseOrigin), this.diff.basePath, this.diff.baseMountKey)
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
    return html`<div class="unknown">Unknown binary format</div>`
  }

  async updated () {
    var editorEl = this.querySelector('.editor')
    if (!editorEl) return
    var [baseContent, targetContent] = await Promise.all([
      this.diff.change === 'del' || this.diff.change === 'mod' ? (new Hyperdrive(this.targetOrigin)).readFile(this.diff.targetPath).catch(e => '') : '',
      this.diff.change === 'add' || this.diff.change === 'mod' ? (new Hyperdrive(this.baseOrigin)).readFile(this.diff.basePath).catch(e => '') : '',
    ])
    createDiffEditor(editorEl, baseContent, targetContent)
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

var diffEditor
async function createDiffEditor (el, baseContent, targetContent) {
  if (diffEditor) diffEditor.dispose()
  var opts = {
    folding: false,
    renderLineHighlight: 'all',
    lineNumbersMinChars: 4,
    automaticLayout: true,
    fixedOverflowWidgets: true,
    roundedSelection: false,
    minimap: {enabled: false}
  }
  diffEditor = monaco.editor.createDiffEditor(el, opts)
  diffEditor.setModel({
    original: monaco.editor.createModel(baseContent, 'text/plain'),
    modified: monaco.editor.createModel(targetContent, 'text/plain')
  })
}