/* globals DatArchive */

import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {findParent} from '../../../lib/fg/event-handlers'
import {pluralize} from '../../../lib/strings'
import {RehostSlider} from '../../../lib/fg/rehost-slider'
import * as pages from '../../pages'

const NETWORK_STATS_POLL_INTERVAL = 500 // ms
const HELP_DOCS_URL = 'https://beakerbrowser.com/docs/how-beaker-works/peer-to-peer-websites'

export class DatsiteMenuNavbarBtn {
  constructor (page) {
    this.page = page
    this.isDropdownOpen = false
    this.rehostSlider = null
    this.networkStats = null
    this.networkStatsPoll = null

    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  render () {
    const page = this.page
    const isViewingDat = page && !!page.getViewedDatOrigin()
    if (!isViewingDat || !page.siteInfo) {
      return ''
    }

    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = this.renderRehostDropdown(page)
    }

    // render btn
    return yo`
      <div id=${this.elId} class="rehost-navbar-menu">
        <button class="nav-peers-btn" onclick=${e => this.onClickDropdownBtn(e)}>
          <i class="fa fa-share-alt"></i>
          ${page.siteInfo.peers || 0}
        </button>
        ${dropdownEl}
      </div>
    `
  }

  renderRehostDropdown (page) {
    const isOwner = page.siteInfo.isOwner
    const {downloadSpeed, uploadSpeed, downloadTotal, uploadTotal} = this.networkStats

    return yo`
      <div class="dropdown datsite-menu-dropdown rehost-menu-dropdown">
        <div class="dropdown-items datsite-menu-dropdown-items rehost-menu-dropdown-items with-triangle">
          <div class="header">
            <div class="header-info">
              <img class="favicon" src="beaker-favicon: ${page.getURL()}"/>
              <h1 class="page-title">
                ${page.siteInfo.title && page.siteInfo.title.length
                  ? page.siteInfo.title
                  : yo`<em>Untitled</em>`
                }
              </h1>
            </div>

            <div class="peer-count">
              ${page.siteInfo.peers || '0'} ${pluralize(page.siteInfo.peers, 'peer')} seeding these files.
              <a class="link" onclick=${() => this.onOpenPage(HELP_DOCS_URL)}>Learn more.</a>
            </div>

            <div class="net-stats">
              <div><span class="fa fa-arrow-down"></span> ${prettyBytes(downloadTotal)}</div>
              <div><span class="fa fa-arrow-up"></span> ${prettyBytes(uploadTotal)}</div>
            </div>
          </div>

          ${this.rehostSlider ? this.rehostSlider.render() : ''}

          <div class="network-url">
            <a onclick=${e => this.onOpenPage(`beaker://editor/${page.siteInfo.url}#network`)}>
              <i class="fa fa-cog"></i>
              View network activity
            </a>
          </div>
        </div>
      `
  }

  get elId () {
    return 'toolbar-datsite-menu-' + this.page.id
  }

  updateActives () {
    yo.update(document.getElementById(this.elId), this.render())
  }

  async open () {
    const page = this.page
    if (!page || !page.siteInfo) {
      return
    }
    this.networkStats = Object.assign({}, page.siteInfo.networkStats)

    // render dropdown
    this.isDropdownOpen = true
    this.updateActives()

    // start tracking the site
    this.rehostSlider = new RehostSlider(page.siteInfo)
    await this.rehostSlider.setup()
    await this.fetchNetworkStats()
    this.networkStatsPoll = setInterval(() => this.fetchNetworkStats(), NETWORK_STATS_POLL_INTERVAL)

    // rerender dropdown
    this.updateActives()
  }

  close () {
    if (this.isDropdownOpen) {
      clearInterval(this.networkStatsPoll)
      this.rehostSlider.teardown()
      this.isDropdownOpen = false
      this.rehostSlider = null
      this.networkStatsPoll = null
      this.updateActives()
    }
  }

  async fetchNetworkStats () {
    const page = this.page
    if (!page || !page.siteInfo) {
      return
    }
    try {
      var info = await (new DatArchive(page.siteInfo.key)).getInfo()
    } catch (e) {
      console.warn('Timed out getting dat info')
      return
    }
    page.siteInfo.peers = info.peers
    Object.assign(this.networkStats, info.networkStats)
    this.updateActives()
  }

  onClickAnywhere (e) {
    var parent = findParent(e.target, 'rehost-navbar-menu')
    if (parent) return // abort - this was a click on us!
    this.close()
  }

  async onClickDropdownBtn () {
    // toggle the dropdown
    if (this.isDropdownOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  onOpenPage (href) {
    this.isDropdownOpen = false
    pages.setActive(pages.create(href))
  }
}
