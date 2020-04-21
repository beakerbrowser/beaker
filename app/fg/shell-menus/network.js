/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import _get from 'lodash.get'
import * as bg from './bg-process-rpc'
import inputsCSS from './inputs.css'

class NetworkMenu extends LitElement {
  static get properties () {
    return {
      daemonStatus: {type: Object}
    }
  }

  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.daemonStatus = undefined
  }

  async init (params) {
    this.daemonStatus = await bg.beakerBrowser.getDaemonStatus()
  }

  // rendering
  // =

  render () {
    if (!this.daemonStatus) return html`<div class="wrapper"></div>`
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <h1 class="page-title">
            Network Status
          </h1>
        </div>

        <div class="body">
          <table>
            <tr>
              <td>Hole-punchable:</td>
              <td>
                ${this.daemonStatus.holepunchable
                  ? html`<span class="fa-fw fas fa-check"></span> Yes`
                  : html`<span class="fa-fw fas fa-exclamation-triangle"></span> No`
                }
              </td>
            </tr>
            <tr><td>Remote Address:</td> <td>${this.daemonStatus.remoteAddress}</td></tr>
          </table>
        </div>
      </div>
    `
  }

  // events
  // =

  updated () {
    // adjust dimensions based on rendering
    var width = this.shadowRoot.querySelector('div').clientWidth
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.shellMenus.resizeSelf({width, height})
  }

}
NetworkMenu.styles = [inputsCSS, css`
.wrapper {
  color: #333;
  width: 300px;
}

.header {
  font-size: 12px;
  font-weight: 500;
  padding: 10px;
  border-bottom: 1px solid #dde;
}

h1.page-title {
  font-size: 0.825rem;
  font-weight: 500;
  margin: 0;
}

.body {
  padding: 8px;
}

table {
  font-size: 12px;
  white-space: nowrap;
}

table tr td:first-child {
  font-weight: 500;
  padding-right: 5px;
}

table tr td:last-child {
  font-family: monospace;
  letter-spacing: 0.5px;
}

`]

customElements.define('network-menu', NetworkMenu)
