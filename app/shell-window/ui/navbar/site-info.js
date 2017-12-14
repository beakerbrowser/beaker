/* globals beaker */

import * as yo from 'yo-yo'
import * as pages from '../../pages'
import renderPadlockIcon from '../icon/padlock'
import { findParent } from '../../../lib/fg/event-handlers'
import PERMS from '../../../lib/perms'
import { ucfirst, getPermId, getPermParam, shortenHash } from '../../../lib/strings'

export class SiteInfoNavbarBtn {
  constructor (page) {
    this.isDropdownOpen = false
    this.page = page
    window.addEventListener('click', e => this.onClickAnywhere(e)) // close dropdown on click outside
    pages.on('set-active', e => this.closeDropdown()) // close dropdown on tab change
  }

  render () {    
    // pull details
    var iconEl = ''
    var protocolCls = 'insecure'
    var gotInsecureResponse = this.page.siteLoadError && this.page.siteLoadError.isInsecureResponse

    if (this.page.protocolInfo) {
      var isHttps = ['https:'].includes(this.page.protocolInfo.scheme)

      if (isHttps && !gotInsecureResponse && !this.page.siteLoadError) {
        protocolCls = 'secure'
        iconEl = renderPadlockIcon()
      } else if (this.page.protocolInfo.scheme === 'http:') {
        iconEl = yo`<i class="fa fa-info-circle"></i>`
      } else if (isHttps && gotInsecureResponse) {
        iconEl = yo`<i class="fa fa-exclamation-circle"></i>`
      } else if (this.page.protocolInfo.scheme === 'dat:') {
        protocolCls = 'p2p'
        iconEl = yo`<i class="fa fa-share-alt"></i>`
      } else if (this.page.protocolInfo.scheme === 'app:') {
        protocolCls = 'app'
        iconEl = yo`<i class="fa fa-window-maximize"></i>`
      } else if (this.page.protocolInfo.scheme === 'beaker:') {
        protocolCls = 'beaker'
        iconEl = ''
      }
    }

    return yo`
      <div class="toolbar-site-info ${protocolCls}">
        <button onclick=${e => this.toggleDropdown(e)}>${iconEl}</button>
        ${this.renderDropdown()}
      </div>
    `
  }

  renderDropdown () {
    if (!this.isDropdownOpen) {
      return ''
    }

    // pull details
    var protocolDesc = ''
    if (this.page.protocolInfo) {
      if (this.page.protocolInfo.scheme === 'https:') {
        protocolDesc = 'Your connection to this site is secure.'
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
        protocolDesc = yo`<span>
          This site was downloaded from a secure peer-to-peer network.
          <a onclick=${e => this.learnMore()}>Learn More</a>
        </span>`
      } else if (this.page.protocolInfo.scheme === 'app:') {
        if (this.page.protocolInfo.binding) {
          let url = this.page.protocolInfo.binding.url
          let link = url.startsWith('dat://')
            ? yo`<a href="${url}" onclick=${this.openLink.bind(this)}>${shortenHash(url)}</a>`
            : url.slice('file://'.length)
          protocolDesc = yo`<span>
            This site is installed on your computer from ${link}
          </span>`
        }
      }
    }

    // site permissions
    var permsEls = []
    if (this.page.sitePerms) {
      for (var k in this.page.sitePerms) {
        permsEls.push(this.renderPerm(k, this.page.sitePerms[k]))
      }
    }
    if (this.page.siteInfo && this.page.siteInfo.requiresRefresh) {
      permsEls.push(
        yo`
          <div class="perm"><a>
            <label class="checked" onclick=${this.onClickRefresh.bind(this)}>
              <i class="fa fa-undo fa-flip-horizontal"></i>
              Refresh to apply changes.
            </label>
          </a></div>
        `
      )
    }

    // dropdown
    return yo`
      <div class="dropdown toolbar-dropdown toolbar-site-info-dropdown">
        <div class="dropdown-items with-triangle left">
          <div class="details">
            <div class="details-title">
              ${this.getTitle() || this.getHostname() || this.getUrl()}
            </div>
            <p class="details-desc">
              ${protocolDesc}
            </p>
          </div>
          ${permsEls.length ? yo`<h2 class="perms-heading">Permissions</h2>` : ''}
          <div class="perms">${permsEls}</div>
        </div>
      </div>`
  }

  getTitle () {
    var title = ''
    if (this.page.siteInfoOverride && this.page.siteInfoOverride.title) {
      title = this.page.siteInfoOverride.title
    } else if (this.page.siteInfo && this.page.siteInfo.title) {
      title = this.page.siteInfo.title
    } else if (this.page.protocolInfo && this.page.protocolInfo.scheme === 'dat:') {
      title = 'Untitled'
    }
    return title
  }

  getUrl () {
    return (this.page.protocolInfo) ? this.page.protocolInfo.url : ''
  }

  getHostname () {
    return (this.page.protocolInfo) ? this.page.protocolInfo.hostname : ''
  }

  updateActives () {
    // FIXME
    // calling `this.render` for all active site-infos is definitely wrong
    // there is state captured in `this` that is specific to each instance
    // ...this entire thing is kind of bad
    // -prf
    Array.from(document.querySelectorAll('.toolbar-site-info')).forEach(el => yo.update(el, this.render()))
  }

  onClickAnywhere (e) {
    if (!this.isDropdownOpen) return
    // close the dropdown if not a click within the dropdown
    if (findParent(e.target, 'toolbar-site-info-dropdown')) return
    this.closeDropdown()
  }

  onClickRefresh () {
    this.page.reload()
    this.closeDropdown()
  }

  closeDropdown () {
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false
      this.updateActives()
    }
  }

  toggleDropdown (e) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    this.isDropdownOpen = !this.isDropdownOpen
    this.updateActives()
  }

  renderPerm (perm, value) {
    const permId = getPermId(perm)
    const permParam = getPermParam(perm)
    var icon = PERMS[permId] ? PERMS[permId].icon : ''
    var desc = PERMS[permId] ? PERMS[permId].desc : ''
    if (typeof desc === 'function') desc = desc(permParam, pages, { capitalize: true })
    if (typeof desc === 'string') desc = ucfirst(desc)
    if (!desc) return ''
    return yo`
      <div class="perm">
        <label class=${value ? 'checked' : ''} onclick=${e => this.togglePerm(perm)}>
          <i class="fa fa-${icon}"></i>
          ${desc}
          <input type="checkbox" value="${perm}" ${value ? 'checked' : ''} />
        </label>
      </div>`
  }

  togglePerm (perm) {
    // update perm
    var newValue = (this.page.sitePerms[perm] === 1) ? 0 : 1
    beaker.sitedata.setPermission(this.page.protocolInfo.url, perm, newValue).then(() => {
      this.page.sitePerms[perm] = newValue

      // requires refresh?
      const permId = getPermId(perm)
      this.page.siteInfo.requiresRefresh = (PERMS[permId] && PERMS[permId].requiresRefresh)

      // rerender
      this.updateActives()
    })
  }

  openLink (e) {
    e.preventDefault()
    pages.setActive(pages.create(e.target.getAttribute('href')))
    this.closeDropdown()
  }

  learnMore () {
    pages.setActive(pages.create('https://github.com/beakerbrowser/beaker/wiki/Is-Dat-%22Secure-P2P%3F%22'))
  }
}
