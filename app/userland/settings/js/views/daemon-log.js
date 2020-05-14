import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import _debounce from 'lodash.debounce'
import viewCSS from '../../css/views/fs-audit-log.css.js'
import { toNiceDomain } from '../../../app-stdlib/js/strings.js'
import { timeDifference } from '../../../app-stdlib/js/time.js'

class DaemonLogView extends LitElement {
  static get properties () {
    return {
    }
  }

  static get styles () {
    return viewCSS
  }

  constructor () {
    super()

    this.isLoading = false
    this.rows = undefined
  }

  async load () {
    this.isLoading = true
    this.requestUpdate()

    this.rows = await beaker.logger.listDaemonLog()

    this.isLoading = false
    this.requestUpdate()
  }

  unload () {
  }

  // rendering
  // =

  render () {
    if (!this.rows) {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <div class="logger loading">Loading...</div>
      `
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="logger">
        <table class="rows">
          <thead>
            <tr class="logger-row">
              <th class="level">level</th>
              <th class="time">time</th>
              <th class="method">method</th>
              <th class="msg">msg</th>
            </tr>
          </thead>
          <tbody>${this.rows.map((row, i) => this.renderRow(row, i))}</tbody>
        </table>
      </div>
    `
  }

  renderRow (row, i) {
    return html`
      <tr class="logger-row">
        <td class="level"><code>${row.level}</code></td>
        <td class="time"><code>${timeDifference(row.time, true)}</code></td>
        <td class="method"><code>${row.method}</code></td>
        <td class="msg"><code>${row.stack || row.msg}</code></td>
      </tr>
    `
  }

  // events
  // =

}
customElements.define('daemon-log-view', DaemonLogView)
