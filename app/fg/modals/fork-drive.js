/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import prettyHash from 'pretty-hash'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'
import spinnerCSS from './spinner.css'

const STATES = {
  READY: 0,
  DOWNLOADING: 1,
  CLONING: 2
}

class ForkDriveModal extends LitElement {
  static get properties () {
    return {
      state: {type: Number},
      label: {type: String},
      title: {type: String},
      description: {type: String},
      isDetached: {type: Boolean}
    }
  }

  static get styles () {
    return [commonCSS, inputsCSS, buttonsCSS, spinnerCSS, css`
    .wrapper {
      padding: 0;
    }
    
    h1.title {
      padding: 14px 20px;
      margin: 0;
      border-color: #bbb;
    }
    
    form {
      padding: 14px 20px;
      margin: 0;
    }

    .loading {
      padding: 20px 22px 20px;
      font-size: 15px;
      font-style: normal;
      border-bottom: 1px solid #ccd;
      color: rgba(0, 0, 0, 0.6);
    }

    .columns {
      display: grid;
      grid-template-columns: auto 1fr;
      grid-gap: 12px;
    }

    .toggle {
      justify-content: unset;
      background: #fafafd;
      padding: 14px 20px;
      margin: -14px -20px 12px;
      border-bottom: 1px solid #bbb;
    }

    .toggle .switch {
      margin-right: 8px;
    }

    .toggle .text {
      font-weight: 500;
      font-size: 13px;
      letter-spacing: 0.15px;
      line-height: 1;
    }

    input {
      font-size: 14px;
      height: 34px;
      padding: 0 10px;
      border-color: #bbb;
    }
    
    select {
      -webkit-appearance: none;
      display: inline-block;
      font-size: 13px;
      font-weight: 500;
      padding: 8px 30px 8px 10px;
      max-width: 100%;
      border: 1px solid #bbc;
      border-radius: 4px;
      outline: 0;
      background-color: #fff;
      background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAARVBMVEUAAAAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAz1sU3AAAAFnRSTlMAAwQMERkbIikuVWl0dXeDtLXF5PH5X4+8lwAAAIxJREFUSInt0TcCwjAQRNFvE5dkwKD7H5WGINsKszWa+r9qoO1ftjqc1B0N2DyDYwNcPX0Ia0Yf2HFx9Y+e7u4Be6B3CAOXsPcTqrDvd5qw6G1FxL0ipn1dzPuaWPZlkepLIt3nRa7PiXyfFqU+Jcr9UtT6uaj3U6H0sdD6n1D7j9B76M7jbevo29rgBddTP/7iwZL3AAAAAElFTkSuQmCC);
      background-repeat: no-repeat;
      background-position: right .7em top 50%, 0 0;
      background-size: .65em auto, 100%;
    }

    .help {
      margin-top: -8px;
      opacity: 0.6;
    }
    
    hr {
      border: 0;
      border-top: 1px solid #ddd;
      margin: 10px 0;
    }

    .form-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .fork-dat-progress {
      font-size: 14px;
    }
    `]
  }

  constructor () {
    super()

    // internal state
    this.driveInfo = null
    this.state = STATES.READY

    // params
    this.cbs = null
    this.forks = []
    this.base = undefined
    this.label = ''
    this.title = ''
    this.description = ''
    this.isDetached = false
  }

  async init (params, cbs) {
    // store params
    this.cbs = cbs
    this.forks = params.forks
    this.base = this.forks.find(fork => fork.url === params.url) || this.forks[0]
    this.label = params.label || ''
    await this.requestUpdate()

    // fetch drive info
    this.driveInfo = await bg.hyperdrive.getInfo(this.base.url)
    this.title = this.driveInfo.title || ''
    this.description = this.driveInfo.description || ''
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
    if (!this.driveInfo) {
      return this.renderLoading()
    }

    var progressEl
    var actionBtn
    switch (this.state) {
      case STATES.READY:
        progressEl = html`<div class="fork-dat-progress">Ready to fork.</div>`
        actionBtn = html`<button type="submit" class="btn primary" tabindex="5">Create fork</button>`
        break
      case STATES.DOWNLOADING:
        progressEl = html`<div class="fork-dat-progress">Downloading remaining files...</div>`
        actionBtn = html`<button type="submit" class="btn" disabled tabindex="5"><span class="spinner"></span></button>`
        break
      case STATES.CLONING:
        progressEl = html`<div class="fork-dat-progress">Downloading and copying...</div>`
        actionBtn = html`<button type="submit" class="btn" disabled tabindex="5"><span class="spinner"></span></button>`
        break
    }

    const baseOpt = (fork) => {
      return html`
        <option value=${fork.url} ?selected=${this.base === fork}>
          ${fork.forkOf && fork.forkOf.label ? fork.forkOf.label : 'Original'}
        </option>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">Make a Fork of ${this.driveInfo.title ? `"${this.driveInfo.title}"` : prettyHash(this.driveInfo.key)}</h1>

        <form @submit=${this.onSubmit}>
          <label class="toggle">
            <input
              type="checkbox"
              name="detach"
              .checked=${this.isDetached}
              @click=${this.onToggleDetached}
            >
            <div class="switch"></div>
            <span class="text">Make independent copy</span>
          </label>
          
          ${this.isDetached ? html`
            <input autofocus name="title" tabindex="1" value=${this.title || ''} @change=${this.onChangeTitle} required placeholder="Title" />
            <input name="desc" tabindex="2" @change=${this.onChangeDescription} value=${this.description || ''} placeholder="Description (optional)">
          ` : html`
            <div class="columns">
              <div>
                <label for="base">Base</label>
                <div style="margin: 5px 0 8px">
                  <select name="base" tabindex="1" @change=${this.onChangeBase}>
                    ${baseOpt(this.forks[0])}
                    <optgroup label="Forks">
                      ${repeat(this.forks.slice(1), fork => baseOpt(fork))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div>
                <label for="label">Label</label>
                <input
                  name="label"
                  tabindex="2"
                  value="${this.label}"
                  @change=${this.onChangeLabel}
                  placeholder="e.g. 'dev' or 'my-new-feature'"
                  autofocus
                  required
                />
                <p class="help">The label will help you identify the fork.</p>
              </div>
            </div>
          `}
          
          <hr>

          <div class="form-actions">
            ${progressEl}
            <div>
              <button type="button" class="btn cancel" @click=${this.onClickCancel} tabindex="4">Cancel</button>
              ${actionBtn}
            </div>
          </div>
        </form>
      </div>
    `
  }

  renderLoading () {
    return html`
      <div class="wrapper">
        <h1 class="title">Make a Fork</h1>
        <div class="loading">Loading...</div>
        <form>
          <div class="form-actions">
            <div></div>
            <div>
              <button type="button" class="btn cancel" @click=${this.onClickCancel} tabindex="4">Cancel</button>
              <button type="submit" class="btn" tabindex="5" disabled>Create fork</button>
            </div>
          </div>
        </form>
      </div>
    `
  }

  // event handlers
  // =

  onToggleDetached (e) {
    this.isDetached = !this.isDetached
  }

  async onChangeBase (e) {
    this.base = this.forks.find(fork => fork.url === e.currentTarget.value)
    this.driveInfo = await bg.hyperdrive.getInfo(this.base.url)
    this.requestUpdate()
  }

  onChangeLabel (e) {
    this.label = e.target.value
  }

  onChangeTitle (e) {
    this.title = e.target.value
  }

  onChangeDescription (e) {
    this.description = e.target.value
  }

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()

    if (this.isDetached) {
      if (!this.title.trim()) return
    } else {
      if (!this.label.trim()) return
    }

    // this.state = STATES.DOWNLOADING
    // await bg.hyperdrive.download(this.base.url)

    this.state = STATES.CLONING
    try {
      var url = await bg.hyperdrive.forkDrive(this.base.url, {
        detached: this.isDetached,
        title: this.title,
        description: this.description,
        label: this.label,
        prompt: false
      })
      this.cbs.resolve({url})
    } catch (e) {
      this.cbs.reject(e.message || e.toString())
    }
  }
}

customElements.define('fork-drive-modal', ForkDriveModal)