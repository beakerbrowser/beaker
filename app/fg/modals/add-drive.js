/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'
import spinnerCSS from './spinner.css'
import './img-fallbacks.js'

class AddDriveModal extends LitElement {
  static get properties () {
    return {
      info: {type: Object},
      error: {type: String}
    }
  }

  static get styles () {
    return [commonCSS, inputsCSS, buttonsCSS, spinnerCSS, css`
    .wrapper {
      padding: 0;
    }
    h1.title {
      font-size: 17px;
      padding: 14px 20px;
      border-color: #f0f0f7;
      margin: 0;
    }
    form {
      padding: 0;
      margin: 0;
    }
    .loading {
      display: flex;
      align-items: center;
      padding: 20px;
      font-size: 15px;
      border-bottom: 1px solid #f0f0f7;
    }
    .loading .spinner {
      margin-right: 10px;
    }
    .error {
      padding: 20px;
      margin: 0;
      font-size: 15px;
      color: #555;
      border-bottom: 1px solid #f0f0f7;
    }
    .drive {
      display: flex;
      align-items: center;
      height: 108px;
      padding: 10px 20px;
      border-bottom: 1px solid #f0f0f7;
      box-sizing: border-box;
    }
    .drive img {
      border-radius: 4px;
      object-fit: cover;
      width: 80px;
      height: 80px;
      margin-right: 16px;
      box-sizing: border-box;
    }
    .drive .title {
      font-size: 23px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .drive .description {
      font-size: 17px;
    }
    .drive .info {
      flex: 1;
    }
    .tags {
      margin: 10px 18px 0;
    }
    .form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 20px 14px;
      text-align: left;
    }
    `]
  }

  constructor () {
    super()
    this.cbs = undefined
    this.tags = ''
    this.info = undefined
    this.error = undefined
  }

  init (params, cbs) {
    this.url = params.url
    this.tags = params.tags || ''
    this.cbs = cbs
    this.info = undefined
    this.error = undefined
    this.requestUpdate()
    this.tryFetch()
  }

  async tryFetch () {
    try {
      this.error = undefined
      var info = await bg.hyperdrive.getInfo(this.url)
      if (info.version === 0) {
        this.error = 'Unable to find this site on the network'
      } else {
        this.info = info
        this.tags = Array.from(new Set(info.tags.concat(this.tags.split(' ')))).join(' ')
      }
    } catch (e) {
      this.cbs.reject(e.message)
    }
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">Add Hyperdrive to My Library</h1>
        <form @submit=${this.onSubmit}>
          ${this.error ? html`
            <div class="error">
              <span class="fas fa-fw fa-exclamation-circle"></span> ${this.error}
            </div>
          ` : this.info ? html`
            <div class="drive">
              <beaker-img-fallbacks>
                <img src="${this.info.url}/thumb" slot="img1">
                <img src="beaker://assets/default-thumb" slot="img2">
              </beaker-img-fallbacks>
              <div class="info">
                <div class="title"><span>${this.info.title}</span></div>
                <div class="description"><span>${this.info.description}</span></div>
              </div>
            </div>
          ` : html`
            <div class="loading">
              <span class="spinner"></span> Loading drive info...
            </div>
          `}
          ${this.info ? html`
            <div class="tags">
              <label for="tags-input">Tags</label>
              <input id="tags-input" @change=${this.onChangeTags} value=${this.tags || ''} placeholder="Tags (optional, separated by spaces)">
            </div>
          ` : ''}
          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
            ${this.error ? html`
              <button type="submit" class="btn primary" tabindex="5">Try Again</button>
            ` : html`
              <button type="submit" class="btn primary" tabindex="5" ?disabled=${!this.info}>OK</button>
            `}
          </div>
        </form>
      </div>
    `
  }

  // event handlers
  // =

  updated () {
    // adjust size based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.modals.resizeSelf({height})
  }

  onChangeTags (e) {
    this.tags = e.currentTarget.value
  }

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()
    if (this.info) {
      this.cbs.resolve({key: this.info.key, tags: this.tags.split(' ')})
    } else {
      this.tryFetch()
    }
  }
}

customElements.define('add-drive-modal', AddDriveModal) 