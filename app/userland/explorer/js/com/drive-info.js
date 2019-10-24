import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import bytes from 'beaker://app-stdlib/vendor/bytes/index.js'
import { ucfirst } from 'beaker://app-stdlib/js/strings.js'

export class DriveInfo extends LitElement {
  static get properties () {
    return {
      driveInfo: {type: Object},
      isThumbLoaded: {type: Boolean},
      hasThumb: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.driveInfo = undefined
    this.isThumbLoaded = false
    this.hasThumb = true
  }

  createRenderRoot () {
    return this // no shadow dom
  }

  get visibility () {
    var info = this.driveInfo
    if (!info.ident) return undefined
    if (info.ident.isRoot) return 'private'
    if (info.ident.isUser) return 'public'
    if (info.ident.libraryEntry) {
      return info.ident.libraryEntry.visibility
    }
    return undefined
  }

  get title () {
    var info = this.driveInfo
    if (info.title) return info.title
    if (info.ident.isRoot) return 'My Hyperdrive'
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
            <img src="/thumb" @load=${this.onThumbLoad} @error=${this.onThumbError} style=${this.isThumbLoaded ? '' : 'display: none'}>
          ` : ''}
          <a href="/">${this.title}</a>
        </h1>
        ${this.driveInfo.description ? html`<p>${this.driveInfo.description}</p>` : undefined}
        ${this.renderType()}
        <div class="bottom-ctrls">
          <button class="transparent">Settings <span class="fas fa-caret-down"></span></button>
          <button class="transparent">Tools <span class="fas fa-caret-down"></span></button>
        </div>
      </section>
      ${this.driveInfo.type === 'unwalled.garden/person' && !this.driveInfo.ident.isUser ? html`
        <section class="btn primary"><span class="fa-fw fas fa-user-plus"></span> Add to <code>/public/friends</code></section>
      ` : ''}
      <section>
        ${this.renderVisibility()}
        ${this.renderIsOwner()}
        ${this.renderSize()}
      </section>
    `
  }

  renderType () {
    if (this.driveInfo.type === 'unwalled.garden/person') {
      return html`<p><span class="fas fa-fw fa-user-circle"></span> Person</p>`
    }
    if (this.driveInfo.type === 'unwalled.garden/website') {
      return html`<p><span class="far fa-fw fa-file-alt"></span> Website</p>`
    }
  }

  renderSize () {
    return html`<p><small>Size:</small> ${bytes(this.driveInfo.size)}</p>`
  }

  renderIsOwner () {
    if (this.driveInfo.isOwner) {
      return html`<p><span class="fas fa-fw fa-pen"></span> Owner</p>`
    }
    return undefined
  }

  renderVisibility () {
    var visibility = this.visibility
    if (!visibility) return undefined
    var icon = ''
    switch (visibility) {
      case 'public': icon = 'fa-globe-americas'; break
      case 'private': icon = 'fa-lock'; break
      case 'unlisted': icon = 'fa-eye'; break
    }
    return html`<p class="visibility ${visibility}"><span class="fa-fw fas ${icon}"></span> ${ucfirst(visibility)}</p>`
  }

  // events
  // =

  onThumbLoad () {
    this.isThumbLoaded = true
  }

  onThumbError () {
    this.hasThumb = false
  }
}

customElements.define('drive-info', DriveInfo)