import { BaseFilesView } from './base-files-view.js'
import { html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import './file-display.js'
import baseCSS from '../../css/com/base-files-view.css.js'
import inlineGridCSS from '../../css/com/inline-file-grid.css.js'

export class InlineFileGrid extends BaseFilesView {
  static get styles () {
    return [baseCSS, inlineGridCSS]
  }

  renderItem (item) {
    var cls = classMap({
      item: true,
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
        <div class="content">
          <file-display
            drive-url=${item.drive.url}
            pathname=${item.path}
            .info=${item}
          ></file-display>
        </div>
        <div class="header">
          <div>
            <a class="name" href=${item.url}>${this.showOrigin ? item.path : item.name}</a>
          </div>
          ${this.showOrigin ? html`
            <div><a class="author" href=${item.drive.url} title=${driveTitle}>${driveTitle}</a></div>
          ` : ''}
        </div>
      </div>
    `
  }
}

customElements.define('inline-file-grid', InlineFileGrid)
