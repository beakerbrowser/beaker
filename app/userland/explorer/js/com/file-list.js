import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { format as formatBytes } from 'beaker://app-stdlib/vendor/bytes/index.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import mainCSS from '../../css/com/file-list.css.js'

export class FileList extends LitElement {
  static get properties () {
    return {
      itemGroups: {type: Array},
      selection: {type: Array},
      showOrigin: {type: Boolean, attribute: 'show-origin'}
    }
  }

  static get styles () {
    return mainCSS
  }

  constructor () {
    super()
    this.itemGroups = []
    this.selection = []
    this.showOrigin = undefined

    this.dateFormatter = new Intl.DateTimeFormat('en-us', {day: "numeric", month: "short", year: "numeric",})
    this.timeFormatter = new Intl.DateTimeFormat('en-US', {hour12: true, hour: "2-digit", minute: "2-digit"})
  }

  // rendering
  // =

  render () {
    var isEmpty = this.itemGroups.reduce((acc, group) => acc && group.length === 0, true)
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${this.itemGroups.map(group => {
        if (group.items.length === 0) return ''
        return html`
          <h4>${group.label}</h4>
          <div class="list">
            ${repeat(group.items, this.renderItem.bind(this))}
          </div>
        `
      })}
      ${isEmpty ? html`
        <h4>Files</h4>
        <div class="empty">This folder is empty</div>
      ` : ''}
    `
  }

  renderItem (item) {
    var cls = classMap({
      item: true,
      mount: item.mountInfo,
      folder: item.stat.isDirectory(),
      file: item.stat.isFile(),
      selected: this.selection.includes(item)
    })
    var driveTitle = item.drive.title || 'Untitled'
    return html`
      <div
        class=${cls}
        @click=${e => this.onClick(e, item)}
        @dblclick=${e => this.onDblClick(e, item)}
      >
        ${this.showOrigin ? html`<span class="author">${driveTitle}</span>` : ''}
        <span class="fas fa-fw fa-${item.icon}"></span>
        <span class="name">${item.name}</span>
        <span class="date">${this.dateFormatter.format(item.stat.ctime)} <span>at</span> ${this.timeFormatter.format(item.stat.ctime)}</span>
        <span class="size">${item.stat.size ? formatBytes(item.stat.size) : ''}</span>
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

customElements.define('file-list', FileList)