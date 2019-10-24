import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import viewCSS from '../../css/views/general.css.js'

class InfoSettingsView extends LitElement {
  static get properties () {
    return {
    }
  }

  static get styles () {
    return viewCSS
  }

  constructor () {
    super()
    this.browserInfo = undefined
  }

  async load () {
    this.browserInfo = beaker.browser.getInfo()
    console.log('loaded', {
      browserInfo: this.browserInfo
    })
    this.requestUpdate()
  }

  // rendering
  // =

  render () {
    if (!this.browserInfo) return html``
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="section">
        <h2 id="information" class="subtitle-heading">About Beaker</h2>
        <p><strong>Version</strong>: ${this.browserInfo.version} <small>(Electron: ${this.browserInfo.electronVersion} - Chromium: ${this.browserInfo.chromiumVersion} - Node: ${this.browserInfo.nodeVersion})</small></p>
        <p><strong>User data</strong>: ${this.browserInfo.paths.userData}</p>
      </div>
      <div class="section">
        <h2 class="subtitle-heading">Get help</h2>
        <ul>
          <li><a href="https://beakerbrowser.com/docs/using-beaker">Take a tour of Beaker</a></li>
          <li><a href="https://beakerbrowser.com/docs">Read the documentation</a></li>
          <li><a href="https://github.com/beakerbrowser/beaker/issues/new">Report an issue</a></li>
        </ul>
      </div>
    `
  }
}
customElements.define('info-settings-view', InfoSettingsView)