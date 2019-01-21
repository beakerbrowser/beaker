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
    this.rows = null
    this.readStream = null
    this.filter = {
      level: AVAILABLE_LEVELS//.slice(0, -1)
    }
  }

  // loading
  // =

  async load () {
    console.log('filter', this.filter)
    this.rows = await beaker.logger.query({limit: 1e5, filter: this.filter, sort: 'desc'})
    console.log(this.rows)

    const rerenderDebounced = _debounce(() => this.rerender(), 500)
    if (this.readStream) this.readStream.close()
    this.readStream = beaker.logger.stream({since: Date.now(), filter: this.filter})
    this.readStream.addEventListener('data', row => {
      this.rows.unshift(row)
      rerenderDebounced()
    })
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
        ${this.renderLevelsFilter()}
        ${this.rows.map(row => this.renderRow(row))}
      </div>
    `
  }

  // method to re-render in place
  // eg inst.rerender()
  rerender () {
    let el = document.querySelector('#logger-' + this.id)
    if (el) yo.update(el, this.render())
  }

  renderLevelsFilter () {
    return yo`
      <div class="levels-filter">
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

  renderRow (row) {
    return yo`
      <div class="logger-row" oncontextmenu=${e => this.onContextmenuRow(e, row)}>
        <span class="level ${row.level}">${row.level}</span>
        <span class="category">${row.category}</span>
        <span class="subcategory">${row.subcategory || row.dataset}</span>
        <span class="msg">${row.message}</span>
        <span class="timestamp">${row.timestamp}</span>
      </div>`
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

    // rerender the filters now so that the UI feels responsive
    yo.update(document.querySelector(`#logger-${this.id} .levels-filter`), this.renderLevelsFilter())

    // reload
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
