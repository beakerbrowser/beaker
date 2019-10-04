import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import bytes from 'beaker://app-stdlib/vendor/bytes/index.js'
import { ucfirst, toNiceUrl, joinPath } from 'beaker://app-stdlib/js/strings.js'
import css from '../../css/com/file-and-folder-info.css.js'

export class FolderInfo extends LitElement {
  static get properties () {
    return {
      title: {type: String},
      driveInfo: {type: Object},
      pathInfo: {type: Object},
      mountInfo: {type: Object}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.title = undefined
    this.driveInfo = undefined
    this.pathInfo = undefined
    this.mountInfo = undefined
  }

  get currentDriveInfo () {
    return this.mountInfo || this.driveInfo
  }

  get visibility () {
    var info = this.currentDriveInfo
    if (!info.ident) return undefined
    if (info.ident.isRoot) return 'private'
    if (info.ident.isUser) return 'public'
    if (info.ident.libraryEntry) {
      return info.ident.libraryEntry.visibility
    }
    return undefined
  }

  getRealUrl (pathname) {
    var slicePoint = this.mountInfo ? (this.mountInfo.mountPath.length + 1) : 0
    return joinPath(this.currentDriveInfo.url, pathname.slice(slicePoint))
  }

  // rendering
  // =

  render () {
    if (!this.currentDriveInfo) return html``
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <section>
        <h3>${this.title}</h3>
        ${this.renderSize()}
      </section>
      <section>
        ${this.renderUrl()}
      </section>
      <section>
        ${this.renderVisibility()}
        ${this.renderIsOwner()}
        ${this.renderType()}
      </section>
    `
  }

  renderUrl () {
    var url = this.getRealUrl(window.location.pathname)
    return html`
      <p class="real-url">
        <span class="fas fa-fw fa-link"></span>
        <a href=${url} target="_blank">${toNiceUrl(url)}</a>
      </p>
    `
  }

  renderType () {
    if (this.currentDriveInfo.type === 'unwalled.garden/person') {
      return html`<p><span class="fas fa-fw fa-user-circle"></span> Person</p>`
    }
    if (this.currentDriveInfo.type === 'unwalled.garden/website') {
      return html`<p><span class="far fa-fw fa-file-alt"></span> Website</p>`
    }
  }

  renderSize () {
    if (this.pathInfo.mount && this.mountInfo) {
      return html`<p><small>Size:</small> ${bytes(this.mountInfo.size)}</p>`
    }
    if (location.pathname === '/') {
      return html`<p><small>Size:</small> ${bytes(this.driveInfo.size)}</p>`
    }
    if (this.pathInfo.isDirectory()) {
      return undefined
    }
    return html`<p><small>Size:</small> ${bytes(this.pathInfo.size)}</p>`
  }

  renderIsOwner () {
    if (this.currentDriveInfo.isOwner) {
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
}

customElements.define('folder-info', FolderInfo)