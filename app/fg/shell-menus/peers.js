/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { pluralize } from '../../lib/strings'
import * as bg from './bg-process-rpc'
import inputsCSS from './inputs.css'
import spinnerCSS from './spinner.css'

const NETWORK_STATS_POLL_INTERVAL = 500 // ms

class PeersMenu extends LitElement {
  static get properties () {
    return {
      isLoading: {type: Boolean},
      url: {type: String}
    }
  }

  constructor () {
    super()
    this.pollInterval = undefined
    this.reset()
  }

  reset () {
    this.isLoading = false
    this.driveInfo = undefined
    this.driveCfg = undefined
    this.peers = []
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
    }
  }

  async init (params) {
    this.isLoading = true
    this.url = params.url
    this.driveInfo = (await bg.views.getTabState('active', {driveInfo: true})).driveInfo
    this.driveCfg = await bg.drives.get(this.url)
    const getPeers = async () => {
      var state = await bg.views.getNetworkState('active')
      this.peers = state?.peers || []
      this.isLoading = false
      return this.requestUpdate()
    }
    await getPeers()

    // periodically fetch updates
    this.pollInterval = setInterval(getPeers, NETWORK_STATS_POLL_INTERVAL)
  }

  // rendering
  // =

  render () {
    var writable = this.driveInfo?.writable || false
    var isSaved = this.driveCfg?.saved || false
    var peers = this.peers
    if (this.isLoading) {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <div class="wrapper"><span class="spinner"></span></div>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <div class="peer-count">
            ${peers.length} ${pluralize(peers.length, 'peer')} connected.
          </div>

          ${''/*<div class="net-stats">
            <div><span class="fa fa-arrow-down"></span> ${prettyBytes(downloadTotal)}</div>
            <div><span class="fa fa-arrow-up"></span> ${prettyBytes(uploadTotal)}</div>
            </div>*/}
        </div>

        ${writable
          ? ''
          : html`
            <label class="toggle">
              <input
                type="checkbox"
                name="host"
                value="host"
                .checked=${isSaved}
                @click=${this.onToggleHosting}
              >
              <div class="switch"></div>
              <span class="text">Host This Hyperdrive</span>
            </label>
          `}

        <div class="addresses">
          ${peers.map(p => html`<div>${p.remoteAddress} (${p.type})</div>`)}
          ${peers.length === 0 ? html`<em>No peers connected</em>` : ''}
        </div>

        ${''/*<div class="network-url">
          <a @click=${e => this.onOpenPage(`beaker://swarm-debugger/${this.url}`)}>
            <i class="fa fa-cog"></i>
            View network activity
          </a>*/}
        </div>
      </div>
    `
  }

  // events
  // =

  onOpenPage (href) {
    bg.shellMenus.createTab(href)
    bg.shellMenus.close()
  }

  async onToggleHosting () {
    if (!this.driveCfg || !this.driveCfg.saved) {
      this.driveCfg = {saved: true}
      await bg.drives.configure(this.url)
    } else {
      this.driveCfg = {saved: false}
      await bg.drives.remove(this.url)
    }
    bg.views.refreshState('active')
  }
}
PeersMenu.styles = [inputsCSS, spinnerCSS, css`
.wrapper {
}

.spinner {
  margin: 12px;
}

.header {
  font-size: 12px;
  font-weight: 500;
}

.header,
.toggle {
  padding: 10px;
  border-bottom: 1px solid var(--border-color--light);
}

.peer-count,
.net-stats {
  color: var(--text-color--menus-wrapper--light);
  font-weight: 300;
}

.net-stats {
  display: flex;
  opacity: 0.9;
}

.net-stats > div {
  margin-right: 14px;
}

.net-stats .fa {
  -webkit-text-stroke: 1px #fff;
}

.toggle {
  justify-content: flex-start;
  margin: 0;
}

.toggle .switch {
  margin-right: 10px;
}

.network-url {
  background: #f5f5f5;
  padding: 10px;
  cursor: pointer;
}

.network-url i {
  color: var(--text-color--menus-wrapper--light);
  margin-right: 3px;
}

.network-url:hover {
  text-decoration: underline;
}

.addresses {
  padding: 5px 10px;
  color: var(--text-color--menus-wrapper--light);
  line-height: 1.6;
  font-family: monospace;
  font-size: 0.9em;
  overflow: auto;
  height: 100px;
}
`]

customElements.define('peers-menu', PeersMenu)
