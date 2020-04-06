import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import viewCSS from '../../css/views/devices.css.js'
import * as toast from '../../../app-stdlib/js/com/toast.js'

class DevicesView extends LitElement {
  static get properties () {
    return {
    }
  }

  static get styles () {
    return viewCSS
  }

  constructor () {
    super()
  }

  async load () {
    this.requestUpdate()
  }

  unload () {
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="section">
        <h2>Sync Devices</h2>

        <p class="message info">
          <span class="fas fa-fw fa-exclamation-triangle"></span>
          Device-sync is still in development.
          We will keep you updated with its progress.
        </p>

        <p style="font-size: 14px">
          <strong>Device-sync will enable you to share your hyperdrives between
          devices.</strong> We're working on protocol updates to support the feature.
          We added this placeholder interface so that you can quickly
          find the status of this feature. Sorry for the fake-out.
        </p>
      </div>
    `
  }

  // events
  // =
}
customElements.define('devices-view', DevicesView)