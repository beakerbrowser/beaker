import { BaseFilesView } from './base-files-view.js'
import { html } from '../../../vendor/lit-element/lit-element.js'
import { classMap } from '../../../vendor/lit-element/lit-html/directives/class-map.js'
import { timeDifference } from '../../lib/time.js'
import '../file/file-display.js'
import baseCSS from '../../../css/com/folder/base-files-view.css.js'
import inlineListCSS from '../../../css/com/folder/inline-file-list.css.js'

export class InlineFileList extends BaseFilesView {
  static get styles () {
    return [baseCSS, inlineListCSS]
  }

  renderItem (item) {
    var cls = classMap({
      item: true
    })
    return html`
      <div
        class=${cls}
        draggable="true"
        data-url=${item.url}
      >
        <div class="content">
          <file-display
            horz
            pathname=${item.path}
            .info=${item}
          ></file-display>
        </div>
      </div>
    `
  }
}

customElements.define('inline-file-list', InlineFileList)
