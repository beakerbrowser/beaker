import { LitElement, html, css } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { pluralize } from '../../../app-stdlib/js/strings.js'
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

    summary {
      border: 1px solid #dde;
      border-radius: 3px;
      padding: 10px;
      margin-bottom: 10px;
    }

    summary a {
      font-size: 17px;
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
      ${repeat(this.networkStatus, (v, i) => i, drive => this.renderDriveStatus(drive))}
    `
  }

  renderDriveStatus (stats) {
    var key = stats[0].metadata.key
    var peers = stats[0].metadata.peers
    var drive = this.drives.find(d => d.key === key)
    return html`
      <summary>
        <div>
          <a href="hyper://${key}/" target="_blank">
            <code>${key.slice(0, 6)}..${key.slice(-2)}</code>
            ${drive ? `(${drive.info.title})` : ''}
          </a>
        </div>
        <div>${peers} ${pluralize(peers, 'peer')}
        <details>
          <pre>${JSON.stringify(stats, null, 2)}</pre>
        </details>
      </summary>
    `
  }

  // events
  // =

}
customElements.define('network-view', NetworkView)