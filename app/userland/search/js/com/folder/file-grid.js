import { BaseFilesView } from './base-files-view.js'
import { html } from '../../../vendor/lit-element/lit-element.js'
import { classMap } from '../../../vendor/lit-element/lit-html/directives/class-map.js'
import baseCSS from '../../../css/com/folder/base-files-view.css.js'
import gridCSS from '../../../css/com/folder/file-grid.css.js'

export class FileGrid extends BaseFilesView {
  static get styles () {
    return [baseCSS, gridCSS]
  }

  renderItem (item) {
    var cls = classMap({
      item: true,
      mount: !!item.mount,
      folder: item.stat.isDirectory(),
      file: item.stat.isFile()
    })
    var driveTitle = item.drive.title || 'Untitled'
    return html`
      <div
        class=${cls}
        draggable="true"
        data-url=${item.url}
      >
        <span class="fas fa-fw fa-${item.icon}"></span>
        ${item.subicon ? html`<span class="subicon ${item.subicon}"></span>` : ''}
        ${item.mount ? html`<span class="mounticon fas fa-external-link-square-alt"></span>` : ''}
        <div class="name">${item.name}</div>
        ${this.showOrigin ? html`<div class="author">${driveTitle}</div>` : ''}
      </div>
    `
  }
}

customElements.define('file-grid', FileGrid)
