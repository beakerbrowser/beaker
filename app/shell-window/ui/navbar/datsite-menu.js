/* globals beaker DatArchive */

import * as yo from 'yo-yo'
import bytes from 'bytes'
import moment from 'moment'
import prettyBytes from 'pretty-bytes'
import {findParent} from '../../../lib/fg/event-handlers'
import {pluralize} from '../../../lib/strings'
import ArchiveProgressMonitor from '../../../lib/fg/archive-progress-monitor'
import ProgressPieSVG from '../../../lib/fg/progress-pie-svg'
import * as pages from '../../pages'

const NOT = 0
const ONEDAY = 1
const ONEWEEK = 2
const ONEMONTH = 3
const FOREVER = 4
const TIMELENS = [
  () => yo`<span>While visiting</span>`,
  () => yo`<span>1 day</span>`,
  () => yo`<span>1 week</span>`,
  () => yo`<span>1 month</span>`,
  () => yo`<span>Forever</span>`
]

export class DatsiteMenuNavbarBtn {
  constructor () {
    this.isDropdownOpen = false
    this.sliderState = undefined
    this.progressMonitor = null
    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  render () {
    const page = pages.getActive()
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
      <div class="rehost-navbar-menu">
        <button class="nav-peers-btn" onclick=${e => this.onClickDropdownBtn(e)}>
          <i class="fa fa-share-alt"></i>
          ${page.siteInfo.peers || 0}
        </button>
        ${dropdownEl}
      </div>
    `
  }

  renderRehostDropdown (page) {
    // calculate the current state
    const isSaved = page.siteInfo.userSettings.isSaved
    const expiresAt = page.siteInfo.userSettings.expiresAt
    const now = Date.now()
    const timeRemaining = (isSaved && expiresAt && expiresAt > now) ? moment.duration(expiresAt - now) : null
    var currentSetting
    if (!isSaved) currentSetting = NOT
    else if (!expiresAt) currentSetting = FOREVER
    else if (timeRemaining.asMonths() > 0.5) currentSetting = ONEMONTH
    else if (timeRemaining.asWeeks() > 0.5) currentSetting = ONEWEEK
    else currentSetting = ONEDAY

    // configure rendering params
    const sliderState = typeof this.sliderState === 'undefined'
      ? currentSetting
      : this.sliderState
    const statusClass =
      (sliderState == NOT ?
        'red' :
        (sliderState == FOREVER ?
          'green' :
          'yellow'))
    const statusLabel = timeRemaining && typeof this.sliderState === 'undefined'
      ? yo`<span>Seeding (${timeRemaining.humanize()} remaining)</span>`
      : TIMELENS[sliderState]()
    const size = (page && page.siteInfo && page.siteInfo.size) ? bytes(page.siteInfo.size, 'mb') : ''

    // render the dropdown if open
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
              ${page.siteInfo.peers || '0'} ${pluralize(page.siteInfo.peers, 'peer')} seeding these files
            </div>
          </div>

          ${!page.siteInfo.isOwner ? yo`
            <div class="rehosting-controls">
              <div>
                <label for="rehost-period">Seed these files</label>
                <input
                  name="rehost-period"
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  list="steplist"
                  value=${sliderState}
                  onchange=${e => this.onChangeTimelen(e)}
                  oninput=${e => this.onChangeTimelen(e)} />
                <datalist id="steplist">
                    <option>0</option>
                    <option>1</option>
                    <option>2</option>
                    <option>3</option>
                    <option>4</option>
                </datalist>
              </div>

              <div class="labels">
                <div class="policy">
                  <i class=${'fa fa-circle ' + statusClass}></i>
                  ${statusLabel}
                </div>
                <div class="size">
                  ${size}
                  ${this.progressMonitor.current < 100
                    ? ProgressPieSVG(this.progressMonitor.current, {size: '10px', color1: '#ccc', color2: '#3579ff'})
                    : ''}
                </div>
              </div>
            </div>
          </div>` : ''}

          <div class="upload-stats">
            Since you last started Beaker you sent ${prettyBytes(page.siteInfo.uploadTotal)}
            of this page to other users visiting this site.
          </div>
            
          <div class="network-url">
            <a onclick=${e => this.onOpenPage('beaker://settings#dat-network-activity')}>
              <i class="fa fa-gear"></i>
              Manage all network activity
            </a>
          </div>
        </div>
      `
  }

  updateActives () {
    Array.from(document.querySelectorAll('.rehost-navbar-menu')).forEach(el => {
      var newEl = this.render()
      if (newEl) yo.update(el, newEl)
    })
  }

  close () {
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false
      this.progressMonitor.stopListening()
      this.progressMonitor = null
      this.updateActives()
    }
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
      // create progress monitor
      const page = pages.getActive()
      if (!page || !page.siteInfo) {
        return
      }
      this.progressMonitor = new ArchiveProgressMonitor(new DatArchive(page.siteInfo.key))
      this.progressMonitor.on('changed', this.updateActives.bind(this))

      // render dropdown
      this.sliderState = undefined
      this.isDropdownOpen = true
      this.updateActives()

      // load progress and render again
      await this.progressMonitor.startListening()
      this.updateActives()
    }
  }

  async onChangeTimelen (e) {
    const page = pages.getActive()
    if (!page || !page.siteInfo) {
      return
    }

    // update the archive settings
    this.sliderState = e.target.value
    const isSaved = this.sliderState == NOT ? false : true
    var expiresAt = 0
    if (this.sliderState == ONEDAY) expiresAt = +(moment().add(1, 'day'))
    if (this.sliderState == ONEWEEK) expiresAt = +(moment().add(1, 'week'))
    if (this.sliderState == ONEMONTH) expiresAt = +(moment().add(1, 'month'))
    if (isSaved) await beaker.archives.add(page.siteInfo.key, {expiresAt})
    else await beaker.archives.remove(page.siteInfo.key)
    page.siteInfo = await (new DatArchive(page.siteInfo.key)).getInfo()

    this.updateActives()
  }

  onOpenPage (href) {
    this.isDropdownOpen = false
    pages.setActive(pages.create(href))
  }
}
