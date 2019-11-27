import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import 'beaker://app-stdlib/js/com/hover-menu.js'

export class ContextualHelp extends LitElement {
  static get properties () {
    return {
      userUrl: {type: String, attribute: 'user-url'},
      realPathname: {type: String, attribute: 'real-pathname'},
      driveInfo: {type: Object},
      mountInfo: {type: Object},
      pathInfo: {type: Object},
      selection: {type: Array},
    }
  }

  constructor () {
    super()
    this.userUrl = undefined
    this.realPathname = undefined
    this.driveInfo = undefined
    this.mountInfo = undefined
    this.pathInfo = undefined
    this.selection = []
  }

  createRenderRoot () {
    return this // no shadow dom
  }

  get targetDrive () {
    if (this.selection.length > 1) return undefined
    if (this.selection.length === 1 && this.selection[0].mountInfo) return this.selection[0].mountInfo
    if (this.mountInfo) return this.mountInfo
    return this.driveInfo
  }

  get targetItemUrl () {
    if (this.selection.length === 1) {
      return this.selection[0].url
    }
    return joinPath(this.targetDrive.url, this.realPathname)
  }

  get targetItemLabel () {
    return this.pathInfo.isDirectory() ? 'folder' : 'file'
  }

  // rendering
  // =

  render () {
    const target = this.targetDrive
    if (!target) return html``
    return html`
      <section class="help">
        <table>
          ${this.renderUrlCtrl()}
          ${this.renderVisibilityHelp()}
          ${this.renderIsWritableHelp()}
        </table>
      </section>
    `
  }

  renderUrlCtrl () {
    if (this.targetDrive.url === navigator.filesystem.url) {
      return ''
    }
    return html`
      <tr>
        <td class="tooltip-right" data-tooltip="Click here to copy the URL" @click=${this.onClickCopyUrl} style="cursor: pointer">
          <span class="fas fa-link"></span>
        </td>
        <td>
          <input value="${this.targetItemUrl}">
        </td>
      </tr>
    `
  }

  renderVisibilityHelp () {
    if (this.targetDrive.url === navigator.filesystem.url) {
      return html`<tr><td><span class="fas fa-lock"></span></td><td>Only you can see this ${this.targetItemLabel}.</td></tr>`
    }
    return html`<tr><td><span class="fas fa-globe"></span></td><td>Anyone with the link can view this ${this.targetItemLabel}.</td></tr>`
  }

  renderIsWritableHelp () {
    if (this.targetDrive.writable) {
      return html`<tr><td><span class="fas fa-fw fa-pen"></span></td><td>Only you can edit this ${this.targetItemLabel}.</td></tr>`
    }
    return html`<tr><td><span class="fas fa-fw fa-eye"></span></td><td>You can not edit this ${this.targetItemLabel}.</td></tr>`
  }

  // events
  // =

  onClickCopyUrl (e) {
    e.preventDefault()
    e.stopPropagation()
    writeToClipboard(this.targetItemUrl)
    toast.create('Copied to clipboard')
  }

}

customElements.define('contextual-help', ContextualHelp)