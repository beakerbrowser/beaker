import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import _debounce from 'lodash.debounce'
import viewCSS from '../../css/views/log.css.js'

const AVAILABLE_LEVELS = ['error', 'warn', 'info', 'verbose', 'debug', 'silly']
const AVAILABLE_CATEGORIES = ['all', 'hyper']

class LogSettingsView extends LitElement {
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
    this.isControlsExpanded = false
    this.rows = undefined
    this.readStream = undefined
    this.isPaused = false
    this.pauseTime = undefined

    try {
      this.settings = JSON.parse(localStorage.logViewerSettings)
    } catch (e) {
      this.settings = {
        level: AVAILABLE_LEVELS.slice(0, -1),
        category: 'all',
        customRules: []
      }
    }
  }

  async load () {
    this.isLoading = true
    this.requestUpdate()
    var filter = {level: this.settings.level}
    if (this.settings.category !== 'all') filter.category = this.settings.category
    this.rows = await beaker.logger.query({limit: 5e2, filter, until: this.pauseTime, sort: 'desc'})
    this.rows = this.rows.filter(row => this.applyCustomRules(row))

    if (this.readStream) this.readStream.close()
    if (!this.isPaused) {
      this.readStream = beaker.logger.stream({since: Date.now(), filter})
      this.readStream.addEventListener('data', row => {
        if (!this.applyCustomRules(row)) return
        this.rows.unshift(row)
        // this.prependRowEl(this.renderRow(row, this.rows.length))
        this.requestUpdate()
      })
    }

    this.isLoading = false
    this.requestUpdate()
  }

  unload () {
    if (this.readStream) this.readStream.close()
  }

  applyCustomRules (row) {
    if (this.settings.customRules.length === 0) {
      return true
    }

    var ret = true
    var rowJson = renderObject(row).toLowerCase()
    for (let filter of this.settings.customRules) {
      let isMatch = rowJson.indexOf(filter.query.toLowerCase()) !== -1
      if (isMatch) {
        if (filter.effect === 'exclude-matches') {
          ret = false
        } else if (filter.effect.startsWith('highlight-')) {
          row.highlight = filter.effect.slice('highlight-'.length)
        }
      } else {
        if (filter.effect === 'exclude-nonmatches') {
          ret = false
        }
      }
    }
    return ret
  }

  saveSettings () {
    localStorage.logViewerSettings = JSON.stringify(this.settings)
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
        ${this.renderControls()}
        <table class="rows">
          <tbody>${this.rows.map((row, i) => this.renderRow(row, i))}</tbody>
        </table>
      </div>
    `
  }

  renderControls () {
    const option = (curr, v, label) => {
      return html`<option value="${v}" ?selected=${curr === v}>${label}</option>`
    }
    return html`
      <div class="controls">
        <div class="standard-controls">
          <button class="btn transparent" @click=${this.onToggleControlsExpanded}>
            <i class="fas fa-${this.isControlsExpanded ? 'angle-down' : 'angle-up'}"></i>
          </button>
          <span class="divider thin"></span>
          ${AVAILABLE_LEVELS.map(level => this.renderLevelFilter(level))}
          <span class="divider"></span>
          ${AVAILABLE_CATEGORIES.map(category => this.renderCategoryFilter(category))}
          <span class="divider"></span>
          <span class="status">
            <button class="btn transparent" @click=${this.onTogglePaused}>
              <i class="fa fa-${this.isPaused ? 'play' : 'pause'}"></i>
              ${this.isPaused ? 'Resume' : 'Pause'}
            </button>
            ${this.isLoading
              ? '[ Loading... ]'
              : this.isPaused
                ? ''
                : '[ Streaming ]'}
          </span>
        </div>
        ${this.isControlsExpanded ? this.settings.customRules.map(rule => html`
          <div class="custom-filter-controls">
            <input type="text" value=${rule.query} @change=${e => this.onChangeCustomRuleQuery(e, rule)}>
            <select @change=${e => this.onChangeCustomRuleEffect(e, rule)}>
              ${option(rule.effect, 'exclude-nonmatches', 'Exclude non-matches')}
              ${option(rule.effect, 'exclude-matches', 'Exclude matches')}
              ${option(rule.effect, 'highlight-green', 'Highlight Green')}
              ${option(rule.effect, 'highlight-blue', 'Highlight Blue')}
              ${option(rule.effect, 'highlight-cyan', 'Highlight Cyan')}
              ${option(rule.effect, 'highlight-purple', 'Highlight Purple')}
              ${option(rule.effect, 'highlight-yellow', 'Highlight Yellow')}
              ${option(rule.effect, 'highlight-red', 'Highlight Red')}
            </select>
            <button class="btn transparent" @click=${() => this.onRemoveCustomRule(rule)}>
              <i class="fa fa-times"></i>
            </button>
          </div>
        `) : ''}
        ${this.isControlsExpanded
          ? html`
            <div>
              <button class="btn transparent" @click=${this.onAddCustomRule}>
                <i class="fas fa-plus"></i> Add rule
              </button>
            </div>`
          : ''}
      </div>`
  }

  renderLevelFilter (level) {
    var isChecked = this.settings.level.includes(level)
    return html`
      <label>
        <input type="checkbox" ?checked=${isChecked} @change=${() => this.onToggleLevelFilter(level)}>
        <i class="far ${isChecked ? 'fa-check-square' : 'fa-square'}"></i> ${level}
      </label>
    `
  }

  renderCategoryFilter (category) {
    var isChecked = this.settings.category === category
    return html`
      <label>
        <input type="checkbox" ?checked=${isChecked} @change=${() => this.onSelectCategory(category)}>
        <i class="far ${isChecked ? 'fa-check-circle' : 'fa-circle'}"></i> ${category}
      </label>
    `
  }

  renderRow (row, i) {
    return html`
      <tr class="logger-row ${row.highlight || ''}">
        <td class="level ${row.level}">${row.level}</td>
        <td class="category">${row.category}</td>
        <td class="subcategory">${row.subcategory || row.dataset}</td>
        <td class="msg">${row.message} ${row.details ? renderDetails(row.details) : ''}</td>
        <td class="timestamp">${row.timestamp}</td>
      </tr>
    `
  }

  // events
  // =

  onToggleLevelFilter (level) {
    // toggle the filter
    if (this.settings.level.includes(level)) {
      this.settings.level = this.settings.level.filter(l => l !== level)
    } else {
      this.settings.level.push(level)
    }
    this.saveSettings()

    // reload
    this.requestUpdate()
    this.load()
  }

  onSelectCategory (category) {
    this.settings.category = category
    this.saveSettings()

    // reload
    this.requestUpdate()
    this.load()
  }

  onToggleControlsExpanded () {
    this.isControlsExpanded = !this.isControlsExpanded
    this.requestUpdate()
  }

  onAddCustomRule () {
    this.settings.customRules.push(new CustomRule())
    this.saveSettings()
    this.requestUpdate()
  }

  onRemoveCustomRule (rule) {
    this.settings.customRules = this.settings.customRules.filter(f => f !== rule)
    this.saveSettings()
    this.requestUpdate()
    this.load()
  }

  onChangeCustomRuleQuery (e, rule) {
    rule.query = e.currentTarget.value
    this.saveSettings()
    this.load()
  }

  onChangeCustomRuleEffect (e, rule) {
    rule.effect = e.currentTarget.value
    this.saveSettings()
    this.load()
  }

  onTogglePaused () {
    this.isPaused = !this.isPaused
    this.pauseTime = (this.isPaused) ? Date.now() : undefined
    this.requestUpdate()
    if (this.isPaused) {
      this.readStream.close()
      this.readStream = null
    } else {
      this.load()
    }
  }
}
customElements.define('log-settings-view', LogSettingsView)

// internal
// =

class CustomRule {
  constructor () {
    this.query = ''
    this.effect = 'exclude-nonmatches'
  }
}

function renderObject (obj) {
  var items = []
  for (let k in obj) {
    var v = obj[k]
    if (Array.isArray(v)) v = `[${v.join(', ')}]`
    if (typeof v === 'object') v = `{${renderObject(v)}}`
    items.push(`${k}=${v}`)
  }
  return items.join(' ')
}

function renderDetails (obj) {
  return html`<small>${renderObject(obj)}</small>`
}