/* globals beaker */
import { html, css } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { BasePopup } from 'beaker://app-stdlib/js/com/popups/base.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import popupsCSS from 'beaker://app-stdlib/css/com/popups.css.js'
import '../post-composer.js'

// exported api
// =

export class NewPostPopup extends BasePopup {
  constructor (opts) {
    super()
    this.driveUrl = opts.driveUrl
  }

  static get properties () {
    return {
    }
  }

  static get styles () {
    return [popupsCSS, css`
    .popup-inner {
      width: 640px;
      border-radius: 8px;
    }
    .popup-inner .body {
      padding: 14px 14px 10px 12px;
    }
    main {
      display: grid;
      grid-template-columns: 30px 1fr;
      grid-gap: 10px;
    }
    img {
      margin-top: 48px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      object-fit: cover;
    }
    beaker-post-composer {
      display: block;
      position: relative;
    }
    beaker-post-composer:before {
      content: '';
      display: block;
      position: absolute;
      top: 59px;
      left: -4px;
      width: 8px;
      height: 8px;
      z-index: 1;
      background: var(--bg-color--default);
      border-top: 1px solid var(--border-color--light);
      border-left: 1px solid var(--border-color--light);
      transform: rotate(-45deg);
    }
    `]
  }

  get shouldShowHead () {
    return false
  }

  get shouldCloseOnOuterClick () {
    return false
  }

  // management
  //

  static async create (opts) {
    return BasePopup.create(NewPostPopup, opts)
  }

  static destroy () {
    return BasePopup.destroy('new-post-popup')
  }

  // rendering
  // =

  renderTitle () {
    return `New post`
  }

  renderBody () {
    return html`
      <main>
        <img src=${joinPath(this.driveUrl, 'thumb')}>
        <beaker-post-composer
          drive-url=${this.driveUrl}
          @publish=${this.onPublish}
          @cancel=${this.onCancel}
        ></beaker-post-composer>
      </main>
    `
  }

  // events
  // =

  async onPublish (e) {
    this.dispatchEvent(new CustomEvent('resolve'))
  }

  async onCancel (e) {
    this.dispatchEvent(new CustomEvent('reject'))
  }
}

customElements.define('new-post-popup', NewPostPopup)