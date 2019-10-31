/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'

class DrivePropertiesModal extends LitElement {
  static get styles () {
    return [commonCSS, inputsCSS, buttonsCSS, css`
    .wrapper {
      padding: 0;
    }
    
    h1.title {
      padding: 14px 20px;
      margin: 0;
      border-color: #bbb;
    }

    form {
      padding: 0;
      margin: 0;
    }

    .props {
      background: #fafafa;
    }

    .prop {
      display: flex;
      align-items: center;
      border-bottom: 1px dashed #ccc;
    }

    .prop:last-child {
      border-bottom: 0;
    }

    .prop .key {
      flex: 0 0 100px;
      padding: 8px 8px 8px 20px;
      border-right: 1px dashed #ccc;
      font-weight: 500;
    }

    .prop input {
      border-radius: 0;
      margin: 0;
      border: 0;
      padding: 0;
      height: auto;
    }

    .prop .img-input,
    .prop input[type="text"] {
      flex: 1;
      font-size: 14px;
      padding: 8px;
      background: #fafafa;
    }

    .prop .img-input:hover,
    .prop input[type="text"]:hover {
      background: #f0f0f0;
    }

    .prop input[type="text"]:focus {
      background: #f0f0f0;
      box-shadow: none;
    }

    .prop .img-input {
      display: flex;
      align-items: center;
    }

    .prop img {
      width: 16px;
      height: 16px;
      object-fit: cover;
      margin-right: 5px;
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
      border-top: 1px dashed #ccc;
      padding: 8px 10px;
    }
    
    .form-actions button {
      padding: 6px 12px;
      font-size: 12px;
    }
    `]
  }

  constructor () {
    super()
    this.cbs = undefined
    this.url = ''
    this.writable = false
    this.props = {}
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.url = params.url
    this.writable = params.writable
    this.props = params.props || {}
    this.props.title = this.props.title || ''
    this.props.description = this.props.description || ''
    this.props.type = this.props.type || ''
    await this.requestUpdate()
    this.adjustHeight()
  }

  adjustHeight () {
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.modals.resizeSelf({height})
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">
          Drive Properties
        </h1>

        <form @submit=${this.onSubmit}>
          <div class="props">
            ${repeat(Object.entries(this.props), entry => this.renderProp(...entry))}

            <div class="prop">
              <div class="key">thumbnail</div>
              <div class="img-input">
                <img src="${this.url}/thumb">
                <input id="thumb-input" type="file" accept=".jpg,.jpeg,.png">
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="cancel" tabindex="5">Cancel</button>
            <button type="submit" class="primary" tabindex="4">OK</button>
          </div>
        </form>
      </div>
    `
  }

  renderProp (key, value) {
    return html`
      <div class="prop">
        <div class="key">${key}</div>
        <input type="text" name=${key} value=${value} ?readonly=${!this.writable}>
      </div>
    `
  }

  // event handlers
  // =

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.resolve()
  }

  async onSubmit (e) {
    e.preventDefault()

    if (!this.writable) {
      return this.cbs.resolve()
    }

    var newProps = Object.fromEntries(new FormData(e.currentTarget))

    // handle thumb file
    var thumbInput = this.shadowRoot.querySelector('#thumb-input')
    if (thumbInput.files[0]) {
      let file = thumbInput.files[0]
      let ext = file.name.split('.').pop()
      let reader = new FileReader()
      let bufPromise = new Promise((resolve, reject) => {
        reader.onload = e => resolve(e.target.result)
        reader.onerror = reject
      })
      reader.readAsArrayBuffer(file)

      await Promise.all([
        bg.datArchive.unlink(this.url, '/thumb.png').catch(e => null),
        bg.datArchive.unlink(this.url, '/thumb.jpg').catch(e => null),
        bg.datArchive.unlink(this.url, '/thumb.jpeg').catch(e => null)
      ])
      await bg.datArchive.writeFile(this.url, `/thumb.${ext}`, await bufPromise)
    }

    // handle props
    await bg.datArchive.configure(this.url, newProps).catch(e => null)

    this.cbs.resolve()
  }
}

customElements.define('drive-properties-modal', DrivePropertiesModal)