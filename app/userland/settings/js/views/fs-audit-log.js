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
    this.stats = undefined
    this.rows = undefined
  }

  async load () {
    this.isLoading = true
    this.requestUpdate()

    this.rows = await beaker.logger.listAuditLog({keys: [], limit: 5e3})

    this.isLoading = false
    this.requestUpdate()

    this.stats = await beaker.logger.getAuditLogStats()
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

    var lastRow
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="stats">
        ${this.stats ? html`
          <table>
            <tr><th>Average:</th><td>${this.stats.runtime.avg|0}ms</td></tr>
            <tr><th>Std Deviation:</th><td>${this.stats.runtime.stdDev|0}ms</td></tr>
            <tr>
              <th>10 longest:</th>
              <td>
                <details>
                  <summary>${this.stats.runtime.longest10.map(row => row.runtime + 'ms').join(', ')}</summary>
                  <pre>${JSON.stringify(this.stats.runtime.longest10, null, 2)}</pre>
                </details>
              </td>
            </tr>
          </table>
        ` : html`
          <span class="spinner"></span>
        `}
      </div>
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
          <tbody>${this.rows.map((row, i) => {
            var tsDiff = lastRow ? (lastRow.ts - row.ts) : 0
            lastRow = row
            return html`
              ${tsDiff > 5e3 ? html`<tr class="gap-row"><td colspan="6"></td></tr>` : ''}
              <tr class="logger-row ${row.runtime > 250 ? 'badish' : ''} ${row.runtime > 1e3 ? 'bad' : ''}">
                <td class="caller">
                  ${!row.caller.startsWith('-') ? html`
                    <a href=${row.caller} target="_blank">${toNiceDomain(row.caller)}</a>
                  ` : row.caller}
                </td>
                <td class="target"><a href=${'hyper://' + row.target} target="_blank">${toNiceDomain(row.target)}</a></td>
                <td class="ts"><code>${timeDifference(row.ts, true)}</code></td>
                <td class="runtime"><code>${row.runtime}ms</code></td>
                <td class="method"><code>${row.method}</code></td>
                <td class="args"><code>${row.args}</code></td>
              </tr>
            `
          })}</tbody>
        </table>
      </div>
    `
  }

  renderRow (row, i) {
  }

  // events
  // =

}
customElements.define('fs-audit-log-view', FsAuditLogView)
