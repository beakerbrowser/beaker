import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import prettyBytes from 'pretty-bytes'
import _get from 'lodash.get'
import {pluralize} from '../lib/strings'
import * as bg from './bg-process-rpc'
import inputsCSS from './inputs.css'

const NETWORK_STATS_POLL_INTERVAL = 500 // ms
const HELP_DOCS_URL = 'https://beakerbrowser.com/docs/how-beaker-works/peer-to-peer-websites'

class PeersMenu extends LitElement {
  static get properties () {
    return {
      url: {type: String}
    }
  }

  constructor () {
    super()
    this.pollInterval = null
    this.reset()
  }

  reset () {
    this.datInfo = null
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
    }
  }

  async init (params) {
    this.url = params.url
    this.datInfo = (await bg.views.getTabState('active', {datInfo: true})).datInfo
    console.log(this.datInfo)
    this.rehostSlider = null // TODO
    await this.requestUpdate()

    // periodically fetch updates
    this.pollInterval = setInterval(async () => {
      this.datInfo.networkStats = await bg.views.getTabState('active', {networkStats: true})
      this.requestUpdate()
    }, NETWORK_STATS_POLL_INTERVAL)

    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.shellMenus.resizeSelf({height})
  }

  // rendering
  // =

  render () {
    var isOwner = _get(this, 'datInfo.isOwner', false)
    var isSaved = _get(this, 'datInfo.userSettings.isSaved', false)
    var peers = _get(this, 'datInfo.peers', 0)
    var downloadTotal = _get(this, 'datInfo.networkStats.downloadTotal', 0)
    var uploadTotal = _get(this, 'datInfo.networkStats.uploadTotal', 0)
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <div class="header-info">
            <img class="favicon" src="beaker-favicon: ${this.url}"/>
            <h1 class="page-title">
              ${_get(this, 'datInfo.title', html`<em>Untitled</em>`)}
            </h1>
          </div>

          <div class="peer-count">
            ${peers} ${pluralize(peers, 'peer')} seeding these files.
            <a class="link" @click=${() => this.onOpenPage(HELP_DOCS_URL)}>Learn more.</a>
          </div>

          <div class="net-stats">
            <div><span class="fa fa-arrow-down"></span> ${prettyBytes(downloadTotal)}</div>
            <div><span class="fa fa-arrow-up"></span> ${prettyBytes(uploadTotal)}</div>
          </div>
        </div>

        ${isOwner
          ? ''
          : html`
            <label class="toggle">
              <input
                type="checkbox"
                name="seed"
                value="seed"
                .checked=${isSaved}
                @click=${this.onToggleSeeding}
              >
              <div class="switch"></div>
              <span class="text">Seed this site${"'"}s files</span>
            </label>
          `}

        <div class="network-url">
          <a @click=${e => this.onOpenPage(`beaker://library/${this.url}#network`)}>
            <i class="fa fa-cog"></i>
            View network activity
          </a>
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

  async onToggleSeeding () {
    this.datInfo.userSettings.isSaved = !this.datInfo.userSettings.isSaved
    await bg.archives.setUserSettings(this.datInfo.key, {isSaved: this.datInfo.userSettings.isSaved})
    bg.views.refreshState('active')
  }
}
PeersMenu.styles = [inputsCSS, css`
.wrapper {
  color: #333;
}

.header {
  font-size: 12px;
  font-weight: 500;
}

.header,
.toggle {
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.header-info {
  display: flex;
  align-items: center;
  line-height: 16px;
  margin-bottom: 2px;
}

h1.page-title {
  font-size: 0.825rem;
  font-weight: 500;
  margin: 0;
}

.favicon {
  width: 16px;
  height: 16px;
  margin-right: 5px;
}

.peer-count,
.net-stats {
  color: #707070;
  font-weight: 300;
  margin-top: 8px
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
  color: #707070;
  margin-right: 3px;
}

.network-url:hover {
  text-decoration: underline;
}
`]

customElements.define('peers-menu', PeersMenu)
