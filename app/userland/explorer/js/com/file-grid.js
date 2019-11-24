import { BaseFilesView } from './base-files-view.js'
import { html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import baseCSS from '../../css/com/base-files-view.css.js'
import gridCSS from '../../css/com/file-grid.css.js'

export class FileGrid extends BaseFilesView {
  static get styles () {
    return [baseCSS, gridCSS]
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
        @click=${e => this.onClickItem(e, item)}
        @dblclick=${e => this.onDblClickItem(e, item)}
        @contextmenu=${e => this.onContextMenuItem(e, item)}
        data-url=${item.url}
      >
        <span class="fas fa-fw fa-${item.icon}"></span>
        ${item.subicon ? html`<span class="subicon ${item.subicon}"></span>` : ''}
        ${item.mountInfo ? html`<span class="mounticon fas fa-external-link-square-alt"></span>` : ''}
        <div class="name">${this.showOrigin ? item.path : item.name}</div>
        ${this.showOrigin ? html`<div class="author">${driveTitle}</div>` : ''}
      </div>
    `
  }
}

customElements.define('file-grid', FileGrid)
