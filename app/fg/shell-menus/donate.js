/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import _get from 'lodash.get'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'

class DonateMenu extends LitElement {
  static get properties () {
    return {
      url: {type: String}
    }
  }

  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.driveInfo = null
  }

  async init (params) {
    this.url = params.url
    this.driveInfo = (await bg.views.getTabState('active', {driveInfo: true})).driveInfo
    await this.requestUpdate()
  }

  resolvePaymentLink (paymentLink) {
    if (!this.url) return paymentLink
    if (paymentLink.indexOf('://') === -1) {
      const shouldAddSlash = !this.url.endsWith('/') && !paymentLink.startsWith('/')
      return `${this.url}${shouldAddSlash ? '/' : ''}${paymentLink}`
    }
    return paymentLink
  }

  // rendering
  // =

  renderDonationLink (paymentLink) {
    const url = this.resolvePaymentLink(paymentLink)
    return html`<a href="#" class="link" @click=${e => this.onOpenPage(url)}>${url}</a>`
  }

  render () {
    var title = _get(this, 'driveInfo.title', 'this site')
    const paymentLink = String(_get(this, 'driveInfo.links.payment.0.href'))

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <div class="header-info">
            <span class="fa fa-hand-holding-usd"></span>
            <h1>Contribute to ${title}</h1>
          </div>
        </div>
        <div class="body">
          <div>
            Visit their donation page to show your appreciation!
          </div>
          <div>
            ${this.renderDonationLink(paymentLink)}
          </div>
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
}
DonateMenu.styles = [commonCSS, css`
.wrapper {
  overflow: hidden;
}

.header {
  height: auto;
  line-height: inherit;
  padding: 10px;
}

.header-info {
  display: flex;
  align-items: baseline;
  margin: 0;
}

.header-info .fa {
  font-size: 14px;
  margin: 0 7px 0 4px;
}

.header-info h1 {
  margin: 0;
  font-size: 14px;
  overflow: hidden;
  font-weight: 500;
}

.body {
  padding: 10px;
  overflow-wrap: break-word;
}
`]

customElements.define('donate-menu', DonateMenu)
