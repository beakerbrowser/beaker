import { LitElement, html, css } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { pluralize, toNiceDomain } from '../../../app-stdlib/js/strings.js'
import viewCSS from '../../css/views/general.css.js'

class NetworkView extends LitElement {
  static get properties () {
    return {
      networkStatus: {type: Array}
    }
  }

  static get styles () {
    return [viewCSS, css`
    :host {
      max-width: none;
    }

    table {
      width: 100%;
    }

    td {
      border-top: 1px solid #dde;
      padding: 12px 16px;
      font-family: monospace;
      white-space: nowrap;
    }

    td:last-child {
      width: 100%;
    }

    progress {
      width: 40px;
    }
    `]
  }

  constructor () {
    super()
    this.networkStatus = undefined
    this.error = undefined
  }

  async load () {
    this.error = undefined
    try {
      var networkStatus = await beaker.browser.getDaemonNetworkStatus()
      for (let item of networkStatus) {
        item.drive = await beaker.drives.get(item.key)
      }
      networkStatus.sort((a, b) => b.peers.length - a.peers.length)
      this.networkStatus = networkStatus
      console.log(this.networkStatus)
    } catch (e) {
      console.error(e)
      this.error = e
    }
  }

  unload () {
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <h3>Active Drives</h3>
      ${this.error ? html`
        <pre>${this.error.toString()}</pre>
      ` : this.networkStatus ? html `
        ${this.networkStatus.length === 0 ? html`
          <p><em>No active drives</em></p>
        ` : ''}
        <table>
          ${repeat(this.networkStatus, (v, i) => i, item => this.renderDriveStatus(item))}
        </table>
      ` : html`<p><span class="spinner"></span></p>`}
    `
  }

  renderDriveStatus (item) {
    var {key, peers, drive} = item
    var domain = drive && drive.ident.system ? 'private' : `${key.slice(0, 6)}..${key.slice(-2)}`
    var title = drive && drive.info && drive.info.title ? `${drive.info.title} (${domain})` : domain
    var forkOf = drive.forkOf ? ` ["${drive.forkOf.label}" fork of ${toNiceDomain(drive.forkOf.key)}]` : ''
    return html`
      <tr>
        <td>
          <a href="hyper://${drive && drive.ident.system ? 'private' : key}/" target="_blank">
            ${title}
            ${forkOf}
          </a>
        </td>
        <td>
          <details>
            <summary>${peers.length} ${pluralize(peers.length, 'peer')}</summary>
            ${peers.map(p => html`<div>${p.remoteAddress} (${p.type})</div>`)}
          </details>
        </td>
      </tr>
    `
  }

  // events
  // =

}
customElements.define('network-view', NetworkView)