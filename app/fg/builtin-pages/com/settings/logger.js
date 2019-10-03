/* globals beaker DatArchive confirm */

import yo from 'yo-yo'
import * as toast from '../toast'
import * as contextMenu from '../context-menu'
import {writeToClipboard} from '../../../lib/event-handlers'
import _debounce from 'lodash.debounce'

const AVAILABLE_LEVELS = ['error', 'warn', 'info', 'verbose', 'debug', 'silly']
const AVAILABLE_CATEGORIES = ['all', 'crawler', 'dat']

// globals
// =

var idCounter = 0

// exports
// =

export default class Logger {
  constructor () {
    this.id = (++idCounter)

    this.isLoading = false
    this.isControlsExpanded = false

    this.rows = null
    this.readStream = null

    try {
      this.settings = JSON.parse(localStorage.settings)
    } catch (e) {
      this.settings = {
        level: AVAILABLE_LEVELS.slice(0, -1),
        category: 'all',
        customRules: []
      }
    }

    this.isPaused = false
    this.pauseTime = undefined
  }

  // loading
  // =

  async load () {
    this.isLoading = true
    this.rerenderControls()
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
        this.prependRowEl(this.renderRow(row, this.rows.length))
      })
    }

    this.isLoading = false
    this.rerender()
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
    localStorage.settings = JSON.stringify(this.settings)
  }

  // rendering
  // =

  // method to render at a place in the page
  // eg yo`<div>${myFilesBrowser.render()}</div>`
  render () {
    if (!this.rows) {
      this.load() // trigger load
      return yo`<div id=${'logger-' + this.id} class="logger loading">Loading...</div>`
    }

    return yo`
      <div id=${'logger-' + this.id} class="logger">
        ${this.renderControls()}
        <table class="rows">
          <tbody>${this.rows.map((row, i) => this.renderRow(row, i))}</tbody>
        </table>
      </div>
    `
  }

  get el () {
    return document.querySelector('#logger-' + this.id)
  }

  // method to re-render in place
  // eg inst.rerender()
  rerender () {
    let el = this.el
    if (el) yo.update(el, this.render())
  }

  rerenderControls () {
    try {
      yo.update(this.el.querySelector(`.controls`), this.renderControls())
    } catch (e) {}
  }

  prependRowEl (rowEl) {
    this.el.querySelector('.rows tbody').prepend(rowEl)
  }

  renderControls () {
    const option = (curr, v, label) => {
      return yo`<option value="${v}" ${curr === v ? 'selected' : ''}>${label}</option>`
    }
    return yo`
      <div class="controls">
        <div class="standard-controls">
          <button class="btn transparent" onclick=${() => this.onToggleControlsExpanded()}>
            <i class="fas fa-${this.isControlsExpanded ? 'angle-down' : 'angle-up'}"></i>
          </button>
          <span class="divider thin"></span>
          ${AVAILABLE_LEVELS.map(level => this.renderLevelFilter(level))}
          <span class="divider"></span>
          ${AVAILABLE_CATEGORIES.map(category => this.renderCategoryFilter(category))}
          <span class="divider"></span>
          <span class="status">
            <button class="btn transparent" onclick=${() => this.onTogglePaused()}>
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
        ${this.isControlsExpanded ? this.settings.customRules.map(rule => yo`
          <div class="custom-filter-controls">
            <input type="text" value=${rule.query} onchange=${e => this.onChangeCustomRuleQuery(e, rule)}>
            <select onchange=${e => this.onChangeCustomRuleEffect(e, rule)}>
              ${option(rule.effect, 'exclude-nonmatches', 'Exclude non-matches')}
              ${option(rule.effect, 'exclude-matches', 'Exclude matches')}
              ${option(rule.effect, 'highlight-green', 'Highlight Green')}
              ${option(rule.effect, 'highlight-blue', 'Highlight Blue')}
              ${option(rule.effect, 'highlight-cyan', 'Highlight Cyan')}
              ${option(rule.effect, 'highlight-purple', 'Highlight Purple')}
              ${option(rule.effect, 'highlight-yellow', 'Highlight Yellow')}
              ${option(rule.effect, 'highlight-red', 'Highlight Red')}
            </select>
            <button class="btn transparent" onclick=${() => this.onRemoveCustomRule(rule)}>
              <i class="fa fa-times"></i>
            </button>
          </div>
        `) : ''}
        ${this.isControlsExpanded
          ? yo`
            <div>
              <button class="btn transparent" onclick=${() => this.onAddCustomRule()}>
                <i class="fas fa-plus"></i> Add rule
              </button>
            </div>`
          : ''}
      </div>`
  }

  renderLevelFilter (level) {
    var isChecked = this.settings.level.includes(level)
    return yo`
      <label>
        <input type="checkbox" checked=${isChecked ? 'checked' : ''} onchange=${() => this.onToggleLevelFilter(level)}>
        <i class="far ${isChecked ? 'fa-check-square' : 'fa-square'}"></i> ${level}
      </label>
    `
  }

  renderCategoryFilter (category) {
    var isChecked = this.settings.category === category
    return yo`
      <label>
        <input type="checkbox" checked=${isChecked ? 'checked' : ''} onchange=${() => this.onSelectCategory(category)}>
        <i class="far ${isChecked ? 'fa-check-circle' : 'fa-circle'}"></i> ${category}
      </label>
    `
  }

  renderRow (row, i) {
    return yo`
      <tr class="logger-row ${row.highlight || ''}" oncontextmenu=${e => this.onContextmenuRow(e, row)}>
        <td class="level ${row.level}">${row.level}</td>
        <td class="category">${row.category}</td>
        <td class="subcategory">${row.subcategory || row.dataset}</td>
        <td class="msg">${row.message} ${row.details ? renderDetails(row.details) : ''}</td>
        <td class="timestamp">${row.timestamp}</td>
      </tr>`
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
    this.rerenderControls()
    this.load()
  }

  onSelectCategory (category) {
    this.settings.category = category
    this.saveSettings()

    // reload
    this.rerenderControls()
    this.load()
  }

  onToggleControlsExpanded () {
    this.isControlsExpanded = !this.isControlsExpanded
    this.rerenderControls()
  }

  onAddCustomRule () {
    this.settings.customRules.push(new CustomRule())
    this.saveSettings()
    this.rerenderControls()
  }

  onRemoveCustomRule (rule) {
    this.settings.customRules = this.settings.customRules.filter(f => f !== rule)
    this.saveSettings()
    this.rerenderControls()
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
    this.rerenderControls()
    if (this.isPaused) {
      this.readStream.close()
      this.readStream = null
    } else {
      this.load()
    }
  }

  async onContextmenuRow (e, row) {
    return // TODO
    e.preventDefault()

    const items = [
      {icon: 'external-link', label: 'Open in new tab', click: () => window.open(row.url)},
      {
        icon: 'link',
        label: 'Copy URL',
        click: () => {
          writeToClipboard(row.url)
          toast.create('URL copied to your clipboard')
        }
      },
      {
        label: 'Crawl site',
        click: () => {
          beaker.crawler.crawlSite(row.url)
          toast.create('Crawl triggered')
        }
      },
      {
        label: 'Rebuild index',
        click: () => {
          beaker.crawler.resetSite(row.url)
          Object.assign(row, initialState(row.url, row.msg, null))
          toast.create('Index was deleted and will now rebuild')
          this.rerender()
        }
      },
      {icon: 'info-circle', label: 'View debug data', click: () => alert(JSON.stringify(row))}
    ]
    await contextMenu.create({x: e.clientX, y: e.clientY, items})
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
  return yo`<small>${renderObject(obj)}</small>`
}

// internal
// =

class CustomRule {
  constructor () {
    this.query = ''
    this.effect = 'exclude-nonmatches'
  }
}