import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import _debounce from 'lodash.debounce'
import viewCSS from '../../css/views/fs-audit-log.css.js'
import { toNiceDomain } from '../../../app-stdlib/js/strings.js'
import { timeDifference } from '../../../app-stdlib/js/time.js'

class FsAuditLogView extends LitElement {
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

    this.rows = await beaker.logger.listAuditLog({keys: [], limit: 5e3})

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
              <th class="caller">caller</th>
              <th class="target">target</th>
              <th class="ts">ts</th>
              <th class="runtime">run time</th>
              <th class="method">method</th>
              <th class="args">args</th>
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
        <td class="caller"><a href=${row.caller} target="_blank">${toNiceDomain(row.caller)}</a></td>
        <td class="target"><a href=${'drive://' + row.target} target="_blank">${toNiceDomain(row.target)}</a></td>
        <td class="ts"><code>${timeDifference(row.ts, true)}</code></td>
        <td class="runtime"><code>${row.runtime}ms</code></td>
        <td class="method"><code>${row.method}</code></td>
        <td class="args"><code>${row.args}</code></td>
      </tr>
    `
  }

  // events
  // =

}
customElements.define('fs-audit-log-view', FsAuditLogView)
