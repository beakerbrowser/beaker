/* globals beaker DatArchive */

import _get from 'lodash.get'
import * as yo from 'yo-yo'
import bytes from 'bytes'
import moment from 'moment'
import {EventEmitter} from 'events'
import ArchiveProgressMonitor from './archive-progress-monitor'
import ProgressPieSVG from './progress-pie-svg'

const ONEDAY = 0
const ONEWEEK = 1
const ONEMONTH = 2
const FOREVER = 3
const TIMELENS = [
  () => yo`<span>1 day</span>`,
  () => yo`<span>1 week</span>`,
  () => yo`<span>1 month</span>`,
  () => yo`<span>Forever</span>`
]

export class RehostSlider extends EventEmitter {
  constructor (siteInfo) {
    super()
    this.id = `rehost-slider-${Date.now()}`
    this.siteInfo = siteInfo
    this.sliderState = undefined
    this.progressMonitor = new ArchiveProgressMonitor(new DatArchive(siteInfo.key))
    this.progressMonitor.on('changed', e => this.rerender())
  }

  async setup () {
    await this.progressMonitor.startListening()
    await this.refreshState()
  }

  async refreshState () {
    this.sliderState = undefined
    this.siteInfo = await (new DatArchive(this.siteInfo.key)).getInfo()
    this.rerender()
  }

  teardown () {
    if (this.progressMonitor) {
      this.progressMonitor.stopListening()
      this.progressMonitor = null
    }
  }

  rerender () {
    var el = document.querySelector('#' + this.id)
    if (el) yo.update(el, this.render())
  }

  render () {
    if (this.siteInfo.isOwner) {
      return ''
    }

    // calculate the current state
    const isSaved = _get(this, 'siteInfo.userSettings.isSaved', false)
    const expiresAt = _get(this, 'siteInfo.userSettings.expiresAt', undefined)
    const now = Date.now()
    const timeRemaining = (isSaved && expiresAt && expiresAt > now) ? moment.duration(expiresAt - now) : null
    var currentSetting
    if (!expiresAt) currentSetting = FOREVER
    else if (timeRemaining && timeRemaining.asMonths() > 0.5) currentSetting = ONEMONTH
    else if (timeRemaining && timeRemaining.asWeeks() > 0.5) currentSetting = ONEWEEK
    else currentSetting = ONEDAY

    // configure rendering params
    const sliderState = typeof this.sliderState === 'undefined'
      ? currentSetting
      : this.sliderState
    const statusClass = sliderState == FOREVER ? 'green' : 'yellow'
    const statusLabel = timeRemaining && typeof this.sliderState === 'undefined'
      ? yo`<span>Seeding (${timeRemaining.humanize()} remaining)</span>`
      : TIMELENS[sliderState]()
    const size = (this.siteInfo && this.siteInfo.size) ? bytes(this.siteInfo.size, 'mb') : ''

    // render the dropdown if open
    return yo`
      <div id=${this.id} class="rehost-slider">
        <label class="toggle">
          <input
            type="checkbox"
            name="seed"
            value="seed"
            ${isSaved ? 'checked' : ''}
            onclick=${e => this.onToggleSeeding(e)}
          >
          <div class="switch"></div>
          <span class="text">Seed this site${"'"}s files</span>
        </label>
        ${isSaved
          ? yo`
            <div class="slider">
              <div>
                <input
                  name="rehost-period"
                  type="range"
                  min="0"
                  max="3"
                  step="1"
                  list="steplist"
                  value=${sliderState}
                  oninput=${e => this.onChangeTimelen(e)} />
                <datalist id="steplist">
                    <option>0</option>
                    <option>1</option>
                    <option>2</option>
                    <option>3</option>
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
            </div>`
          : ''}
      </div>`
  }

  async onToggleSeeding (e) {
    this.sliderState = FOREVER

    // update the archive settings
    var expiresAt = 0
    var isSaved = !this.siteInfo.userSettings.isSaved
    await beaker.archives.setUserSettings(this.siteInfo.key, {isSaved, expiresAt})
    Object.assign(this.siteInfo.userSettings, {isSaved, expiresAt})

    this.rerender()
  }

  async onChangeTimelen (e) {
    this.sliderState = e.target.value

    // update the archive settings
    var expiresAt = 0
    if (this.sliderState == ONEDAY) expiresAt = +(moment().add(1, 'day'))
    if (this.sliderState == ONEWEEK) expiresAt = +(moment().add(1, 'week'))
    if (this.sliderState == ONEMONTH) expiresAt = +(moment().add(1, 'month'))
    await beaker.archives.setUserSettings(this.siteInfo.key, {expiresAt})
    Object.assign(this.siteInfo.userSettings, {expiresAt})

    this.rerender()
  }
}
