import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { timeDifference } from 'beaker://app-stdlib/js/time.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import css from '../../css/view/file.css.js'
import '../com/file-display.js'
import '../com/social-signals.js'
import 'beaker://app-stdlib/js/com/comments/thread.js'

export class FileView extends LitElement {
  static get properties () {
    return {
      userUrl: {type: String, attribute: 'user-url'},
      currentDriveInfo: {type: Object},
      currentDriveTitle: {type: String, attribute: 'current-drive-title'},
      pathInfo: {type: Object},
      realUrl: {type: String, attribute: 'real-url'},
      realPathname: {type: String, attribute: 'real-pathname'},
      renderMode: {type: String, attribute: 'render-mode'}
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
    this.pathInfo = undefined
    this.realUrl = undefined
    this.realPathname = undefined
    this.renderMode = undefined
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
      <div class="content">
        <file-display
          drive-url=${location.origin}
          pathname=${location.pathname}
          render-mode=${this.renderMode}
          .info=${this.pathInfo}
        ></file-display>
      </div>
      <social-signals
        user-url=${this.userUrl}
        topic=${this.realUrl}
        .authors=${[this.userUrl]}
      ></social-signals>
      <beaker-comments-thread
        .comments=${[]}
        topic-url="${this.realUrl}"
        user-url="${this.userUrl}"
      ></beaker-comments-thread>
    `
  }


  // events
  // =

}

customElements.define('explorer-view-file', FileView)
