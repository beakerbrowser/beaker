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

  // rendering
  // =

  render () {
    const target = this.targetDrive
    if (!target) return html``
    const hasSel = this.selection.length > 0
    const sel = hasSel ? this.selection[0] : undefined
    var labels = {
      'This(drive)': hasSel ? 'The selected item' : 'This',
      'This(folder)': hasSel ? 'The selected folder' : 'This folder',
      'here': hasSel ? 'there' : 'here',
      'this drive': hasSel ? 'that drive' : 'this drive'
    }
    var path = hasSel ? sel.path : this.realPathname
    if (target.url === this.userUrl) {
      var help
      if (path === '/feed') {
        help = `${labels['This(folder)']} is your feed. Save files ${labels['here']} to share them with your network.`
      } else if (path === '/friends') {
        help = `${labels['This(folder)']} contains your friends. Add users' drives ${labels['here']} to follow their activity.`
      } else {
        help = `${labels['This(drive)']} is your public profile. It represents you on the network.`
      }
      return html`
        <section class="help">
          <table>
            <tr><td colspan="2">${help}</td></tr>
            <tr><td><span class="fas fa-globe"></span></td><td><strong>All of the files in ${labels['this drive']} are public.</strong></td></tr>
          </table>
        </section>
      `
    }
    if (target.url === navigator.filesystem.url) {
      var help
      if (path === '/library') {
        help = `${labels['This(folder)']} contains all your saved files and drives.`
      } else if (path === '/settings') {
        help = `${labels['This(folder)']} contains configuration for your system.`
      } else {
        help = `${labels['This(drive)']} is your private home drive. It contains all of your personal data.`
      }
      return html`
        <section class="help">
          <table>
            <tr><td colspan="2">${help}</td></tr>
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