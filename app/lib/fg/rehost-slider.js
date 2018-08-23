/* globals beaker DatArchive */

import * as yo from 'yo-yo'
import bytes from 'bytes'
import moment from 'moment'
import {EventEmitter} from 'events'
import ArchiveProgressMonitor from './archive-progress-monitor'
import ProgressPieSVG from './progress-pie-svg'

const NOT = 0
const WHILE_VISITING = 1
const ONEDAY = 2
const ONEWEEK = 3
const ONEMONTH = 4
const FOREVER = 5
const TIMELENS = [
  () => yo`<span>Offline mode (do not sync)</span>`,
  () => yo`<span>While visiting</span>`,
  () => yo`<span>1 day</span>`,
  () => yo`<span>1 week</span>`,
  () => yo`<span>1 month</span>`,
  () => yo`<span>Forever</span>`
]

export class RehostSlider extends EventEmitter {
  constructor (siteInfo) {
    super()
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
    var el = document.querySelector('.rehost-slider')
    if (el) yo.update(el, this.render())
  }

  render () {
    // calculate the current state
    const {networked, autoUpload, expiresAt} = this.siteInfo.userSettings
    const now = Date.now()
    const timeRemaining = (networked && autoUpload && expiresAt && expiresAt > now) ? moment.duration(expiresAt - now) : null
    var currentSetting
    if (!networked) currentSetting = NOT
    else if (!autoUpload) currentSetting = WHILE_VISITING
    else if (!expiresAt) currentSetting = FOREVER
    else if (timeRemaining && timeRemaining.asMonths() > 0.5) currentSetting = ONEMONTH
    else if (timeRemaining && timeRemaining.asWeeks() > 0.5) currentSetting = ONEWEEK
    else currentSetting = ONEDAY

    // configure rendering params
    const sliderState = typeof this.sliderState === 'undefined'
      ? currentSetting
      : this.sliderState
    const statusClass =
      (sliderState == NOT ?
        'red' :
        (sliderState == WHILE_VISITING ?
          'yellow' :
          'green'))
    const statusLabel = timeRemaining && typeof this.sliderState === 'undefined'
      ? yo`<span>Seeding (${timeRemaining.humanize()} remaining)</span>`
      : TIMELENS[sliderState]()
    const size = (this.siteInfo && this.siteInfo.size) ? bytes(this.siteInfo.size, 'mb') : ''

    // render the dropdown if open
    return yo`
      <div class="rehost-slider">
        <div>
          <label for="rehost-period">Seed these files</label>
          <input
            name="rehost-period"
            type="range"
            min="0"
            max="5"
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
              <option>5</option>
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
  }

  async onChangeTimelen (e) {
    // update the archive settings
    this.sliderState = e.target.value
    var networked = (this.sliderState != NOT)
    var autoUpload = (this.sliderState > WHILE_VISITING)
    var shouldSave = autoUpload && !this.siteInfo.userSettings.isSaved
    var expiresAt = 0
    if (this.sliderState == ONEDAY) expiresAt = +(moment().add(1, 'day'))
    if (this.sliderState == ONEWEEK) expiresAt = +(moment().add(1, 'week'))
    if (this.sliderState == ONEMONTH) expiresAt = +(moment().add(1, 'month'))
    if (shouldSave) await beaker.archives.add(this.siteInfo.key, {networked, autoUpload, expiresAt})
    else await beaker.archives.setUserSettings(this.siteInfo.key, {networked, autoUpload, expiresAt})

    this.siteInfo = await (new DatArchive(this.siteInfo.key)).getInfo()
    this.rerender()
  }
}
