import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import mainCSS from '../../css/com/file-grid.css.js'

export class FileGrid extends LitElement {
  static get properties () {
    return {
      items: {type: Array},
      info: {type: Object},
      selection: {type: Array},
      showHidden: {type: Boolean, attribute: 'show-hidden'}
    }
  }

  static get styles () {
    return mainCSS
  }

  constructor () {
    super()
    this.items = []
    this.selection = []
    this.showHidden = false
  }

  async load () {
  }

  get folders () {
    return this.items.filter(i => i.stat.isDirectory() && (this.showHidden || !i.name.startsWith('.')))
  }

  get files () {
    return this.items.filter(i => i.stat.isFile() && (this.showHidden || !i.name.startsWith('.')))
  }
  // rendering
  // =

  render () {
    var folders = this.folders
    var files = this.files

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${folders.length > 0 ? html`
        <h4>Folders</h4>
        <div class="grid">
          ${repeat(folders, this.renderItem.bind(this))}
        </div>
      ` : ''}
      ${files.length > 0 ? html`
        <h4>Files</h4>
        <div class="grid">
          ${repeat(files, this.renderItem.bind(this))}
        </div>
      ` : ''}
      ${files.length === 0 && folders.length === 0 ? html`
        <h4>Files</h4>
        <div class="empty">This folder is empty</div>
      ` : ''}
    `
  }

  renderItem (item) {
    var cls = classMap({
      item: true,
      hidden: item.name.startsWith('.'),
      folder: item.stat.isDirectory(),
      file: item.stat.isFile(),
      selected: this.selection.includes(item)
    })
    var icon = 'file'
    if (item.stat.isDirectory()) {
      icon = 'folder'
    }
    return html`
      <div
        class=${cls}
        @click=${e => this.onClick(e, item)}
        @dblclick=${e => this.onDblClick(e, item)}
      >
        <span class="fas fa-fw fa-${icon}"></span>
        ${item.subicon ? html`<span class="subicon ${item.subicon}"></span>` : ''}
        <span class="name">${item.name}</span>
      </div>
    `
  }

  // events
  // =

  onClick (e, item) {
    e.stopPropagation()

    var selection
    if (e.metaKey) {
      selection = this.selection.concat([item])
    } else {
      selection = [item]
    }
    emit(this, 'change-selection', {detail: {selection}})
  }

  onDblClick (e, item) {
    emit(this, 'goto', {detail: {item}})
  }
}

customElements.define('file-grid', FileGrid)