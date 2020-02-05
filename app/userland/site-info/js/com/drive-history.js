import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { toNiceUrl } from '../../../app-stdlib/js/strings.js'
import css from '../../css/com/drive-history.css.js'

class SiteInfoDriveHistory extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      origin: {type: String},
      info: {type: Object},
      targetVersion: {type: Number}
    }
  }

  static get styles () {
    return [css]
  }

  constructor () {
    super()
    this.url = ''
    this.origin = ''
    this.info = undefined
    this.targetVersion = undefined
  }

  get viewedVersion () {
    try {
      return /\+(.+)$/.exec(this.origin)[1]
    } catch (e) {
      return this.info.version
    }
  }

  // rendering
  // =

  render () {
    if (!this.info) return html``
    var targetVersion = this.targetVersion || this.viewedVersion
    const toLabel = v => (v == this.info.version) ? 'Latest' : `v${v}`
    var tickmarks = []
    for (let i = 0; i < +this.info.version; i++) {
      tickmarks.push(html`<option value=${i}></option>`)
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="ctrls">
        <label for="version">Viewing: ${toLabel(targetVersion)}</label>
      </div>
      <div>
        <input
          type="range"
          id="version"
          name="version"
          min="1"
          max="${this.info.version}"
          value="${targetVersion}"
          step="1"
          @input=${this.onInputVersionSlider}
          @change=${this.onChangeVersionSlider}
        >
      </div>
    `
  }

  // events
  // =

  onInputVersionSlider (e) {
    this.targetVersion = +e.currentTarget.value
  }

  onChangeVersionSlider (e) {
    var url = new URL(this.url)
    url.hostname = url.hostname.replace(/\+(.+)$/, '')
    if (this.targetVersion != this.info.version) {
      url.hostname += `+${this.targetVersion}`
    }
    beaker.browser.gotoUrl(url.toString())

    this.url = url.toString()
    this.origin = url.origin
    this.targetVersion = undefined
  }
}

customElements.define('drive-history', SiteInfoDriveHistory)
