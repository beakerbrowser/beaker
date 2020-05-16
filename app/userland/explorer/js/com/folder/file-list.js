import { BaseFilesView } from './base-files-view.js'
import { html } from '../../../vendor/lit-element/lit-element.js'
import { classMap } from '../../../vendor/lit-element/lit-html/directives/class-map.js'
import { format as formatBytes } from '../../../vendor/bytes/index.js'
import baseCSS from '../../../css/com/folder/base-files-view.css.js'
import listCSS from '../../../css/com/folder/file-list.css.js'

export class FileList extends BaseFilesView {
  static get styles () {
    return [baseCSS, listCSS]
  }

  constructor () {
    super()
    this.dateFormatter = new Intl.DateTimeFormat('en-us', {day: "numeric", month: "short", year: "numeric",})
    this.timeFormatter = new Intl.DateTimeFormat('en-US', {hour12: true, hour: "2-digit", minute: "2-digit"})
  }

  // rendering
  // =

  renderItem (item) {
    var cls = classMap({
      item: true,
      mount: !!item.mount,
      folder: item.stat.isDirectory(),
      file: item.stat.isFile(),
      selected: this.selection.includes(item)
    })
    var driveTitle = item.drive.title || 'Untitled'
    return html`
      <div
        class=${cls}
        draggable="true"
        @click=${e => this.onClickItem(e, item)}
        @dblclick=${e => this.onDblClickItem(e, item)}
        @contextmenu=${e => this.onContextMenuItem(e, item)}
        @dragstart=${e => this.onDragstartItem(e, item)}
        @drop=${e => this.onDropItem(e, item)}
        data-url=${item.url}
      >
        ${this.showOrigin ? html`<span class="author">${driveTitle}</span>` : ''}
        <span class="icon">
          <span class="fas fa-fw fa-${item.icon} mainicon"></span>
          ${item.subicon ? html`<span class="fas fa-fw fa-${item.subicon} subicon"></span>` : ''}
          ${item.mount ? html`<span class="fas fa-fw fa-external-link-square-alt subicon"></span>` : ''}
        </span>
        <span class="name">${this.showOrigin ? item.realPath : item.name}</span>
        <span class="date">${this.dateFormatter.format(item.stat.ctime)} <span>at</span> ${this.timeFormatter.format(item.stat.ctime)}</span>
        <span class="size">${item.stat.size ? formatBytes(item.stat.size) : ''}</span>
      </div>
    `
  }
}

customElements.define('file-list', FileList)