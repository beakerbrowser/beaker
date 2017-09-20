/* globals beaker.browser */

import * as yo from 'yo-yo'
import bytes from 'bytes'
import moment from 'moment'
import {findParent} from '../../../lib/fg/event-handlers'
import ArchiveProgressMonitor from '../../../lib/fg/archive-progress-monitor'
import ProgressPieSVG from '../../../lib/fg/progress-pie-svg'
import * as pages from '../../pages'
import * as navbar from '../navbar'

const NOT = 0
const ONEDAY = 1
const ONEWEEK = 2
const ONEMONTH = 3
const FOREVER = 4
const TIMELENS = [
  () => yo`<span><span>Not</span> rehosting</span>`,
  () => yo`<span>Rehost for <strong>1 day</strong></span>`,
  () => yo`<span>Rehost for <strong>1 week</strong></span>`,
  () => yo`<span>Rehost for <strong>1 month</strong></span>`,
  () => yo`<span>Rehost <strong>forever</strong></span>`,
]

export class RehostMenuNavbarBtn {
  constructor () {
    this.isDropdownOpen = false
    this.sliderState = undefined
    this.progressMonitor = null
    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  render () {
    const page = pages.getActive()
    const isViewingDat = page && page.getIntendedURL().startsWith('dat:')
    if (!isViewingDat || !page.siteInfo || page.siteInfo.isOwner) {
      return ''
    }
  
    // calculate the current state
    const isSaved = page.siteInfo.userSettings.isSaved
    const expiresAt = page.siteInfo.userSettings.expiresAt
    const timeRemaining = (expiresAt && expiresAt > Date.now()) ? moment.duration(expiresAt - Date.now()) : null
    var currentSetting
    if (!isSaved) currentSetting = NOT
    else if (!expiresAt) currentSetting = FOREVER
    else if (timeRemaining.asMonths() > 0.5) currentSetting = ONEMONTH
    else if (timeRemaining.asWeeks() > 0.5) currentSetting = ONEWEEK
    else currentSetting = ONEDAY

    // configure rendering params
    const numPeers = page.siteInfo.peers
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
      ? yo`<span>Rehosting (${timeRemaining.humanize()} remaining)</span>`
      : TIMELENS[sliderState]()
    const size = (page && page.siteInfo && page.siteInfo.size) ? bytes(page.siteInfo.size, 'mb') : ''

    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = yo`
        <div class="dropdown rehost-menu-dropdown">
          <div class="dropdown-items rehost-menu-dropdown-items with-triangle">
            <div class="header">
              <i class="fa fa-cloud-upload"></i>
              Rehost this site
            </div>
            <div>
              <input
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
        </div>
      `
    }

    // render btn
    return yo`<div class="rehost-navbar-menu">
      <button class="nav-peers-btn" onclick=${e => this.onClickRehost(e)}>
        <i class="fa fa-share-alt"></i>
        ${numPeers}
      </button>
      ${dropdownEl}
    </div>`
  }

  updateActives () {
    Array.from(document.querySelectorAll('.rehost-navbar-menu')).forEach(el => yo.update(el, this.render()))
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

  async onClickRehost () {
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
}
