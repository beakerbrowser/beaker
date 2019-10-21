import {  html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { timeDifference } from 'beaker://app-stdlib/js/time.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import { FileGrid } from './file-grid.js'
import './file-display.js'
import './social-signals.js'
import css from '../../css/com/file-feed.css.js'

export class FileFeed extends FileGrid {
  static get properties () {
    return {
      userUrl: {type: String, attribute: 'user-url'},
      currentDriveInfo: {type: Object},
      currentDriveTitle: {type: String, attribute: 'current-drive-title'},
      items: {type: Array},
      selection: {type: Array},
      realUrl: {type: String, attribute: 'real-url'},
      realPathname: {type: String, attribute: 'real-pathname'}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.userUrl = undefined
    this.currentDriveInfo = undefined
    this.currentDriveTitle = undefined
    this.items = undefined
    this.selection = undefined
    this.realUrl = undefined
    this.realPathname = undefined
  }

  // rendering
  // =

  render () {
    var items = this.items.slice().sort(byCTime)

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${items.length > 0 ? repeat(items, this.renderItem.bind(this)) : ''}
    `
  }

  renderItem (item) {
    var cls = classMap({
      item: true,
      selected: this.selection.includes(item)
    })
    var filePathname = joinPath(this.realPathname, item.name)
    var fileUrl = joinPath(this.currentDriveInfo.url, filePathname)
    return html`
      <div
        class=${cls}
        @click=${e => this.onClick(e, item)}
        @dblclick=${e => this.onDblClick(e, item)}
      >
        <div class="header">
          <img src="asset:thumb:${this.currentDriveInfo.url}">
          <a class="author" href=${this.currentDriveInfo.url}>${this.currentDriveTitle}</a>
          <a class="name" href=${fileUrl}>${filePathname}</a>
          <span class="date">${timeDifference(item.stat.ctime, true, 'ago')}</span>
        </div>
        <div class="content">
          <file-display
            fullwidth
            drive-url=${this.currentDriveInfo.url}
            pathname=${filePathname}
            .info=${item.stat}
          ></file-display>
        </div>
        <div class="footer">
          <social-signals
            user-url=${this.userUrl}
            topic=${fileUrl}
            .authors=${[this.userUrl]}
          ></social-signals>
        </div>
      </div>
    `
  }

  // events
  // =
}

customElements.define('file-feed', FileFeed)

function byCTime (a, b) {
  return b.stat.ctime - a.stat.ctime
}