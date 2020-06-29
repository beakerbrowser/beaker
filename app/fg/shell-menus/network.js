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
            <tr><td>Remote Address:</td> <td>${this.daemonStatus.remoteAddress || 'Unknown'}</td></tr>
          </table>
          ${!this.daemonStatus.holepunchable ? html`
            <div class="help">
              <a @click=${this.onClickLink} href="https://docs.beakerbrowser.com/help/hole-punchability">
                <span class="far fa-fw fa-question-circle"></span> What does this mean?
              </a>
           </div>
          ` : ''}
        </div>
      </div>
    `
  }

  // events
  // =

  updated () {
    // adjust dimensions based on rendering
    var width = this.shadowRoot.querySelector('div').clientWidth|0
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.shellMenus.resizeSelf({width, height})
  }

  onClickLink (e) {
    e.preventDefault()
    bg.beakerBrowser.openUrl(e.currentTarget.getAttribute('href'), {setActive: true})
  }
}
NetworkMenu.styles = [inputsCSS, css`
.wrapper {
  width: 300px;
}

.header {
  font-size: 12px;
  font-weight: 500;
  padding: 10px;
  border-bottom: 1px solid var(--border-color--default);
}

h1.page-title {
  font-size: 0.825rem;
  font-weight: 500;
  margin: 0;
}

.body {
  padding: 8px;
  user-select: text;
}

table {
  font-size: 12px;
  white-space: nowrap;
  color: inherit;
}

table tr td:first-child {
  font-weight: 500;
  padding-right: 5px;
}

table tr td:last-child {
  font-family: monospace;
  letter-spacing: 0.5px;
}

.fa-exclamation-triangle {
  color: #FF8F00;
}

.help {
  padding: 2px 3px 0;
}

.help a {
  text-decoration: none;
  color: gray;
}

.help a:hover {
  text-decoration: underline;
}
`]

customElements.define('network-menu', NetworkMenu)
