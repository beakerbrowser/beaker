import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { until } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/until.js'
import bytes from 'beaker://app-stdlib/vendor/bytes/index.js'
import { ucfirst } from 'beaker://app-stdlib/js/strings.js'
import { library, friends } from 'beaker://app-stdlib/js/uwg.js'
import 'beaker://app-stdlib/js/com/hover-menu.js'

export class ContextualHelp extends LitElement {
  static get properties () {
    return {
      userUrl: {type: String, attribute: 'user-url'},
      driveInfo: {type: Object},
      mountInfo: {type: Object},
      pathInfo: {type: Object},
      selection: {type: Array}
    }
  }

  constructor () {
    super()
    this.userUrl = undefined
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
    if (this.selection.length === 1) return this.selection[0].mountInfo
    if (this.mountInfo) return this.mountInfo
    return this.driveInfo
  }

  // rendering
  // =

  render () {
    const target = this.targetDrive
    if (!target) return html``
    var labels = {
      'This': this.selection.length > 0 ? 'The selected item' : 'This',
      'this drive': this.selection.length > 0 ? 'that drive' : 'this drive'
    }
    if (target.url === this.userUrl) {
      return html`
        <section class="help">
          <table>
            <tr><td colspan="2">${labels['This']} is your public profile. It represents you on the network.</td></tr>
            <tr><td><span class="fas fa-globe"></span></td><td><strong>All of the files in ${labels['this drive']} are public.</strong></td></tr>
          </table>
        </section>
      `
    }
    if (target.url === navigator.filesystem.url) {
      return html`
        <section class="help">
          <table>
            <tr><td colspan="2">${labels['This']} is your private home drive. It contains all of your personal data.</td></tr>
            <tr><td><span class="fas fa-lock"></span></td><td><strong>All of the files in ${labels['this drive']} are private.</strong></td></tr>
          </table>
        </section>
      `
    }
  }

  // events
  // =

}

customElements.define('contextual-help', ContextualHelp)