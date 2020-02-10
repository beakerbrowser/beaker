/* globals beaker */
import { html, css } from '../../../vendor/lit-element/lit-element.js'
import { BasePopup } from './base.js'
import popupsCSS from '../../../css/com/popups.css.js'
import '../status/status.js'
import '../comments/thread.js'

// exported api
// =

export class ViewStatusPopup extends BasePopup {
  static get styles () {
    return [popupsCSS, css`
    .popup-inner {
      width: 100%;
      max-width: 640px;
      overflow: visible;
    }

    .popup-inner > .body {
      padding: 4px 4px 8px;
    }

    beaker-status {
      margin: 0;
      border: 0;
    }
    
    beaker-comments-thread {
      --border-color: #fff;
      --body-font-size: 14px;
      --composer-margin: 0 10px;
      --composer-padding: 10px 16px;
      --replies-left-margin: 4px;
      margin-bottom: 10px;
    }
    `]
  }

  constructor ({user, status}) {
    super()
    this.user = user
    this.status = status
  }

  // management
  //

  static async create (parentEl, {user, status}) {
    return BasePopup.coreCreate(parentEl, ViewStatusPopup, {user, status})
  }

  static destroy () {
    return BasePopup.destroy('beaker-view-status-popup')
  }

  // rendering
  // =

  renderTitle () {
    return undefined
  }

  renderBody () {
    return html`
      <beaker-status
        expanded
        inline-avi
        .status=${this.status}
        user-url="${this.user.url}"
      ></beaker-status>
      <beaker-comments-thread
        .comments=${this.status.comments}
        href="${this.status.url}"
        user-url="${this.user.url}"
      ></beaker-comments-thread>
    `
  }

  // events
  // =
}

customElements.define('beaker-view-status-popup', ViewStatusPopup)
