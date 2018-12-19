import * as yo from 'yo-yo'
import {BaseSiteInfo} from './base'

// exported api
// =

export class DefaultSiteInfo extends BaseSiteInfo {
  static shouldRender (page) {
    return true
  }

  render () {
    var protocolDesc = ''
    if (this.page.protocolInfo) {
      if (this.page.protocolInfo.scheme === 'https:') {
        protocolDesc = `Your connection to this site is secure.`
      } else if (this.page.protocolInfo.scheme === 'http:') {
        protocolDesc = yo`
          <div>
            <p>
              Your connection to this site is not secure.
            </p>
            <small>
              You should not enter any sensitive information on this site (for example, passwords or credit cards), because it could be stolen by attackers.
            </small>
          </div>
        `
      } else if (this.page.protocolInfo.scheme === 'dat:') {
        protocolDesc = yo`
          <div>
            This site was downloaded from a secure peer-to-peer network.
            <a onclick=${e => this.onLearnMore()}>Learn More</a>
          </div>`
      }
    }


    return yo`
      <div>
        <div class="details-title">
          ${this.renderTitle() || this.renderHostname() || this.renderUrl()}
        </div>
        <p class="details-desc">
          ${protocolDesc}
        </p>
      </div>`
  }
}
