import {  html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { timeDifference } from 'beaker://app-stdlib/js/time.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import { FileGrid } from './file-grid.js'
import './file-display.js'
import css from '../../css/com/inline-file-list.css.js'

export class InlineFileList extends FileGrid {
  static get properties () {
    return {
      itemGroups: {type: Array},
      selection: {type: Array},
      showOrigin: {type: Boolean, attribute: 'show-origin'}
    }
    
  }
  static get styles () {
    return css
  }

  constructor () {
    super()
    this.itemGroups = []
    this.selection = undefined
    this.showOrigin = undefined
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
        <div class="empty">This folder is empty</div>
      ` : ''}
    `
  }

  renderItem (item) {
    var cls = classMap({
      item: true,
      selected: this.selection.includes(item)
    })
    var driveTitle = item.drive.title || 'Untitled'
    var folder = item.path.split('/').slice(0, -1).join('/') || '/'
    return html`
      <div
        class=${cls}
        @click=${e => this.onClick(e, item)}
        @dblclick=${e => this.onDblClick(e, item)}
        @contextmenu=${e => this.onContextMenu(e, item)}
      >
        <div class="info">
          <div>
            <a class="name" href=${item.url}>${this.showOrigin ? item.path : item.name} ${item.mountInfo ? html`<span class="fas fa-external-link-square-alt"></span>` : ''}</a>
          </div>
          ${this.showOrigin ? html`
            <div>Drive: <a class="author" href=${item.drive.url}>${driveTitle}</a></div>
          ` : ''}
          <div>
            Updated: <span class="date">${timeDifference(item.stat.ctime, true, 'ago')}</span>
          </div>
        </div>
        <div class="content">
          <file-display
            horz
            drive-url=${item.drive.url}
            pathname=${item.path}
            .info=${item}
          ></file-display>
        </div>
      </div>
    `
  }

  // events
  // =
}

customElements.define('inline-file-list', InlineFileList)
