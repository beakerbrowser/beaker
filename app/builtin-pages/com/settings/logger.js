/* globals beaker DatArchive confirm */

import yo from 'yo-yo'
import * as toast from '../toast'
import * as contextMenu from '../context-menu'
import {niceDate} from '../../../lib/time'
import {writeToClipboard} from '../../../lib/fg/event-handlers'
import _debounce from 'lodash.debounce'

const AVAILABLE_LEVELS = ['error', 'warn', 'info', 'verbose', 'debug', 'silly']

// globals
// =

var idCounter = 0

// exports
// =

export default class Logger {
  constructor () {
    this.id = (++idCounter)
    this.generation = 0 // used to track when the node list has changed, should be incremented any time the filters change
    this.rows = null
    this.readStream = null
    this.filter = {
      level: AVAILABLE_LEVELS.slice(0, -1)
    }
    this.isPaused = false
    this.pauseTime = undefined
  }

  // loading
  // =

  async load () {
    this.rows = await beaker.logger.query({limit: 1e5, filter: this.filter, until: this.pauseTime, sort: 'desc'})

    if (this.readStream) this.readStream.close()
    if (!this.isPaused) {
      const rerenderDebounced = _debounce(() => this.rerender(), 500)
      this.readStream = beaker.logger.stream({since: Date.now(), filter: this.filter})
      this.readStream.addEventListener('data', row => {
        this.rows.unshift(row)
        rerenderDebounced()
      })
    }

    this.rerender()
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
        ${this.rows.map((row, i) => this.renderRow(row, i))}
      </div>
    `
  }

  // method to re-render in place
  // eg inst.rerender()
  rerender () {
    let el = document.querySelector('#logger-' + this.id)
    if (el) yo.update(el, this.render())
  }

  renderControls () {
    return yo`
      <div class="controls">
        <span>
          <button class="btn transparent" onclick=${() => this.onTogglePaused()}>
            <i class="fa fa-${this.isPaused ? 'play' : 'pause'}"></i>
            ${this.isPaused ? 'Resume' : 'Pause'}
          </button>
        </span>
        ${AVAILABLE_LEVELS.map(level => this.renderLevelFilter(level))}
      </div>`
  }

  renderLevelFilter (level) {
    var isChecked = this.filter.level.includes(level)
    return yo`
      <label>
        <input type="checkbox" checked=${isChecked ? 'checked' : ''} onchange=${() => this.onToggleLevelFilter(level)}>
        <i class="far ${isChecked ? 'fa-check-square' : 'fa-square'}"></i> ${level}
      </label>
    `
  }

  renderRow (row, i) {
    var id = `${this.generation}-${this.rows.length - i}`
    var rowEl = yo`
      <div id=${id} class="logger-row level-${row.level}" oncontextmenu=${e => this.onContextmenuRow(e, row)}>
        <span class="level ${row.level}">${row.level}</span>
        <span class="category">${row.category}</span>
        <span class="subcategory">${row.subcategory || row.dataset}</span>
        <span class="msg">${row.message} ${row.details ? renderDetails(row.details) : ''}</span>
        <span class="timestamp">${row.timestamp}</span>
      </div>`
    rowEl.isSameNode = other => other.id === id
    return rowEl
  }

  // events
  // =

  onToggleLevelFilter (level) {
    // toggle the filter
    if (this.filter.level.includes(level)) {
      this.filter.level = this.filter.level.filter(l => l !== level)
    } else {
      this.filter.level.push(level)
    }
    this.generation++

    // rerender the filters now so that the UI feels responsive
    yo.update(document.querySelector(`#logger-${this.id} .controls`), this.renderControls())

    // reload
    this.load()
  }

  onTogglePaused () {
    this.isPaused = !this.isPaused
    this.pauseTime = (this.isPaused) ? Date.now() : undefined
    this.load()
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

function renderDetails (obj) {
  var items = []
  for (let k in obj) {
    var v = obj[k]
    if (Array.isArray(v)) v = `[${v.join(',')}]`
    if (typeof v === 'object') v = JSON.stringify(v)
    items.push(`${k}=${v}`)
  }
  return yo`<small>(${items.join(' ')})</small>`
}
