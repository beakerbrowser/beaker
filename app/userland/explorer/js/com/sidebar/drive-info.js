import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import bytes from '../../../vendor/bytes/index.js'

export class DriveInfo extends LitElement {
  static get properties () {
    return {
      realUrl: {type: String, attribute: 'real-url'},
      driveInfo: {type: Object},
      hasThumb: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.realUrl = undefined
    this.driveInfo = undefined
    this.hasThumb = true
  }

  createRenderRoot () {
    return this // no shadow dom
  }

  get title () {
    var info = this.driveInfo
    if (info.title) return info.title
    return 'Untitled'
  }

  // rendering
  // =

  render () {
    if (!this.driveInfo) return html``
    return html`
      <section>
        <h1>
          ${this.hasThumb ? html`
            <img @error=${this.onThumbError}>
          ` : ''}
          <a href="/">${this.title}</a>
        </h1>
        ${this.driveInfo.description ? html`<p>${this.driveInfo.description}</p>` : undefined}
        <p class="facts">
          ${this.renderType()}
          ${this.renderSize()}
        </p>
        <div class="bottom-ctrls">
          <a class="btn" href=${this.realUrl}><span class="fas fa-fw fa-desktop"></span> Open</a>
        </div>
      </section>
    `
  }

  updated () {
    // HACK
    // for reasons I cant understand, just changing the `src` attribute failed to update the image
    // this solves that issue
    // -prf
    try {
      this.querySelector('img').removeAttribute('src')
      this.querySelector('img').setAttribute('src', `${this.driveInfo.url}/thumb`)
    } catch (e) {}
  }

  renderType () {
    if (this.driveInfo.type === 'unwalled.garden/person') {
      return html`<span><span class="fas fa-fw fa-user-circle"></span> Person</span>`
    }
    if (this.driveInfo.type === 'unwalled.garden/website') {
      return html`<span><span class="far fa-fw fa-file-alt"></span> Website</span>`
    }
  }

  renderSize () {
    if (this.driveInfo.size) {
      return html`<span><span class="fas fa-fw fa-save"></span> ${bytes(this.driveInfo.size)}</span>`
    }
  }

  // events
  // =

  onThumbError () {
    this.hasThumb = false
  }
}

customElements.define('drive-info', DriveInfo)