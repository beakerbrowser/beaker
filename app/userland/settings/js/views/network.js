import { LitElement, html, css } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { pluralize } from '../../../app-stdlib/js/strings.js'
import bytes from '../../../app-stdlib/vendor/bytes/index.js'
import viewCSS from '../../css/views/general.css.js'

class NetworkView extends LitElement {
  static get properties () {
    return {
      networkStatus: {type: Array},
      drives: {type: Array}
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
    this.networkStatus = []
    this.drives = []
  }

  async load () {
    this.networkStatus = await beaker.browser.getDaemonNetworkStatus()
    this.drives = await beaker.drives.list()
    console.log(this.networkStatus, this.drives)
  }

  unload () {
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <table>
        ${repeat(this.networkStatus, (v, i) => i, drive => this.renderDriveStatus(drive))}
      </table>
    `
  }

  renderDriveStatus (stats) {
    var key = stats[0].metadata.key
    var peers = stats[0].metadata.peers
    var drive = this.drives.find(d => d.key === key)
    var uploadedBytes = stats.reduce((acc, v) => acc + v.metadata.uploadedBytes + v.content.uploadedBytes, 0)
    var downloadedBytes = stats.reduce((acc, v) => acc + v.metadata.downloadedBytes + v.content.downloadedBytes, 0)
    var downloadedBlocks = stats.reduce((acc, v) => acc + v.metadata.downloadedBlocks + v.content.downloadedBlocks, 0)
    var totalBlocks = stats.reduce((acc, v) => acc + v.metadata.totalBlocks + v.content.totalBlocks, 0)
    return html`
      <tr>
        <td>
          <a href="hyper://${key}/" target="_blank">
            ${key.slice(0, 6)}..${key.slice(-2)}
            ${drive ? `(${drive.info.title})` : ''}
          </a>
        </td>
        <td>
          ${peers} ${pluralize(peers, 'peer')}
        </td>
        <td>
          ${bytes(uploadedBytes)} uploaded
        </td>
        <td>
          ${bytes(downloadedBytes)} downloaded
        </td>
        <td>
          <progress value="${downloadedBlocks / totalBlocks}" max="1"></progress>
          ${(downloadedBlocks / totalBlocks * 100)|0}% synced
        </td>
        <td>
          <summary>
            <details>
              <pre>${JSON.stringify(stats, null, 2)}</pre>
            </details>
          </summary>
        </td>
      </tr>
    `
  }

  // events
  // =

}
customElements.define('network-view', NetworkView)