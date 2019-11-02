import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import bytes from 'beaker://app-stdlib/vendor/bytes/index.js'
import { ucfirst } from 'beaker://app-stdlib/js/strings.js'
import { library, friends } from 'beaker://app-stdlib/js/uwg.js'
import 'beaker://app-stdlib/js/com/hover-menu.js'

export class DriveInfo extends LitElement {
  static get properties () {
    return {
      userUrl: {type: String, attribute: 'user-url'},
      driveInfo: {type: Object},
      isThumbLoaded: {type: Boolean},
      hasThumb: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.userUrl = undefined
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
    return undefined
  }

  get title () {
    var info = this.driveInfo
    if (info.title) return info.title
    if (info.ident.isRoot) return 'Filesystem'
    return 'Untitled'
  }

  get isInLibrary () {
    return !!this.driveInfo.ident.libraryQuery
  }

  get isInFriends () {
    return !!this.driveInfo.ident.friendsQuery
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
      </section>
      ${this.driveInfo.type === 'unwalled.garden/person' && this.driveInfo.url !== this.userUrl ? html`
        <section class="btn" @click=${this.onToggleFriends}>
          ${this.isInFriends ? html`
            <span class="fa-fw fas fa-user-minus"></span> Remove from Friends
          ` : html`
            <span class="fa-fw fas fa-user-plus"></span> Add to Friends
          `}
        </section>`
      : ''}
      ${this.driveInfo.type !== 'unwalled.garden/person' ? html`
        <section class="btn" @click=${this.onToggleLibrary}>
          ${this.isInLibrary ? html`
            <span class="fa-mod"><span class="fa-fw fas fa-university"></span><span class="fas fa-minus"></span></span> Remove from Library
          ` : html`
            <span class="fa-mod"><span class="fa-fw fas fa-university"></span><span class="fas fa-plus"></span></span> Add to Library
          `}
        </section>
      ` : ''}
      <section>
        ${this.renderVisibility()}
        ${this.renderIsWritable()}
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

  renderIsWritable () {
    if (this.driveInfo.writable) {
      return html`<p><span class="fas fa-fw fa-pen"></span> Writable</p>`
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

  async onToggleFriends () {
    if (this.isInFriends) {
      await friends.remove(this.driveInfo.url)
    } else {
      await friends.add(this.driveInfo.url, this.driveInfo.title)
    }
    location.reload()
  }

  async onToggleLibrary () {
    if (this.isInLibrary) {
      await library.remove(this.driveInfo.url)
    } else {
      await library.add(this.driveInfo.url, this.driveInfo.title)
    }
    location.reload()
  }
}

customElements.define('drive-info', DriveInfo)