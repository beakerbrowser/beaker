import * as yo from 'yo-yo'
import {BaseSiteInfo} from './base'

// exported api
// =

export class DefaultSiteInfo extends BaseSiteInfo {
  static shouldRender (page) {
    return true
  }

  render () {
    var titleEl = ''
    var descEl = ''
    const {protocolInfo, siteInfo, siteTrust} = this.page

    if (siteTrust) {
      if (siteTrust.isDomainVerified && protocolInfo && protocolInfo.hostname) {
        titleEl = yo`<div class="title">${this.renderHostname()}</div>`
      }
    }
    if (!titleEl && siteInfo && siteInfo.title) {
      // even if the title isn't trusted, show it here
      // there will be a "not trusted" indicator
      titleEl = yo`<div class="title">${this.renderTitle()}</div>`
    }

    if (titleEl) {
      if (titleEl.textContent.length > 30) {
        titleEl.classList.add('smaller')
      } else if (titleEl.textContent.length > 20) {
        titleEl.classList.add('small')
      }
    }

    if (protocolInfo) {
      if (protocolInfo.scheme === 'https:') {
        descEl = yo`<div class="trust-info"><span class="label trusted">Your connection to this site is secure.</span></div>`
      } else if (protocolInfo.scheme === 'http:') {
        descEl = [
          yo`<div class="trust-info">
            <span class="label not-trusted">Your connection to this site is NOT secure.</span>
          </div>`,
          yo`<div class="description">
            <small>
              You should not enter any sensitive information on this site (for example, passwords or credit cards), because it could be stolen by attackers.
            </small>
          </div>`
        ]
      } else if (protocolInfo.scheme === 'dat:') {
        if (siteInfo.isOwner) {
          descEl = yo`<div class="trust-info"><span class="label trusted">You created this site.</span></div>`
        } else if (siteTrust && siteTrust.isDomainVerified) {
          descEl = yo`<div class="trust-info"><span class="label trusted">This domain has been verified.</span></div>`
        } else {
          descEl = yo`<div class="trust-info"><span class="label not-trusted">The identity of this site can not be verified.</span></div>`
        }
      }
    }

    return yo`<div class="site-info-details default-site-info">${titleEl}${descEl}</div>`
  }
}
