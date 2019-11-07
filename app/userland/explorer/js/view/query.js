import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { timeDifference } from 'beaker://app-stdlib/js/time.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import { createEditor } from '../lib/monaco.js'
import css from '../../css/view/file.css.js'
import '../com/file-display.js'
import '../com/viewfile-query.js'
import '../com/social-signals.js'
import 'beaker://app-stdlib/js/com/comments/thread.js'

export class QueryView extends LitElement {
  static get properties () {
    return {
      currentDriveInfo: {type: Object},
      currentDriveTitle: {type: String, attribute: 'current-drive-title'},
      pathInfo: {type: Object},
      items: {type: Array},
      itemGroups: {type: Array},
      selection: {type: Array},
      renderMode: {type: String, attribute: 'render-mode'},
      inlineMode: {type: Boolean, attribute: 'inline-mode'},
      realUrl: {type: String, attribute: 'real-url'},
      realPathname: {type: String, attribute: 'real-pathname'}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.currentDriveInfo = undefined
    this.currentDriveTitle = undefined
    this.pathInfo = undefined
    this.items = undefined
    this.itemGroups = undefined
    this.selection = undefined
    this.renderMode = undefined
    this.inlineMode = undefined
    this.realUrl = undefined
    this.realPathname = undefined
  }

  get pathAncestry () {
    var ancestry = []
    var acc = []
    for (let part of this.realPathname.split('/')) {
      if (!part) continue
      acc.push(part)
      ancestry.push([
        joinPath(this.currentDriveInfo.url, acc.join('/')),
        part
      ])
    }
    return ancestry
  }

  // rendering
  // =

  render () {
    if (!this.currentDriveInfo || !this.pathInfo) return html``
    return html`
      <div class="header">
        <a class="author" href=${this.currentDriveInfo.url}>${this.currentDriveTitle}</a>
        ${this.pathAncestry.map(([url, name]) => html`/ <a class="name" href=${url}>${name}</a>`)}
        <span class="date">${timeDifference(this.pathInfo.ctime, true, 'ago')}</span>
      </div>
      ${this.renderMode === 'grid' ? (
        this.inlineMode
          ? html`<inline-file-grid show-origin .itemGroups=${this.itemGroups} .selection=${this.selection}></inline-file-grid>`
          : html`<file-grid show-origin .itemGroups=${this.itemGroups} .selection=${this.selection}></file-grid>`
      ) : (
        this.inlineMode
          ? html`<inline-file-list show-origin .itemGroups=${this.itemGroups} .selection=${this.selection}></inline-file-list>`
          : html`<file-list show-origin .itemGroups=${this.itemGroups} .selection=${this.selection}></file-list>`
      )}
      <social-signals
        topic=${this.realUrl}
        .authors=${[]}
      ></social-signals>
      <beaker-comments-thread
        .comments=${[]}
        topic-url="${this.realUrl}"
      ></beaker-comments-thread>
    `
  }

  // events
  // =
}

customElements.define('explorer-view-query', QueryView)
