import { LitElement, html, css } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { pluralize, toNiceDomain } from '../../../app-stdlib/js/strings.js'
import bytes from '../../../app-stdlib/vendor/bytes/index.js'
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
      for (let stats of networkStatus) {
        stats[0].drive = await beaker.drives.get(stats[0].metadata.key)
      }
      this.networkStatus = networkStatus
      console.log(this.networkStatus)
    } catch (e) {
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
          ${repeat(this.networkStatus, (v, i) => i, drive => this.renderDriveStatus(drive))}
        </table>
      ` : html`<p><span class="spinner"></span></p>`}
    `
  }

  renderDriveStatus (stats) {
    var key = stats[0].metadata.key
    var peers = stats[0].metadata.peers
    var peerAddresses = stats[0].peerAddresses
    var drive = stats[0].drive
    var uploadedBytes = stats.reduce((acc, v) => acc + v.metadata.uploadedBytes + v.content.uploadedBytes, 0)
    var downloadedBytes = stats.reduce((acc, v) => acc + v.metadata.downloadedBytes + v.content.downloadedBytes, 0)
    var domain = drive && drive.ident.system ? 'system' : `${key.slice(0, 6)}..${key.slice(-2)}`
    var title = drive && drive.info && drive.info.title ? `${drive.info.title} (${domain})` : domain
    var forkOf = drive.forkOf ? ` ["${drive.forkOf.label}" fork of ${toNiceDomain(drive.forkOf.key)}]` : ''
    return html`
      <tr>
        <td>
          <a href="hyper://${drive && drive.ident.system ? 'system' : key}/" target="_blank">
            ${title}
            ${forkOf}
          </a>
        </td>
        <td>
          <details>
            <summary>${peers} ${pluralize(peers, 'peer')}</summary>
            ${peerAddresses.map(addr => html`<div>${addr}</div>`)}
          </details>
        </td>
        <td>
          ${bytes(uploadedBytes)} uploaded
        </td>
        <td>
          ${bytes(downloadedBytes)} downloaded
        </td>
        <td>
          <details>
            <pre>${JSON.stringify(stats, null, 2)}</pre>
          </details>
        </td>
      </tr>
    `
  }

  // events
  // =

}
customElements.define('network-view', NetworkView)