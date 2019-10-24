import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import viewCSS from '../../css/views/crawler.css.js'
import { niceDate } from '../../../../lib/time'
import { getHostname } from '../../../../lib/strings'
import { writeToClipboard } from '../../../../fg/lib/event-handlers'
import * as toast from '../../../app-stdlib/js/com/toast.js'
import * as contextMenu from '../../../app-stdlib/js/com/context-menu.js'

class CrawlerSettingsView extends LitElement {
  static get properties () {
    return {
    }
  }

  static get styles () {
    return viewCSS
  }

  constructor () {
    super()
    this.crawlerEvents = undefined
    this.crawlStates = undefined
    this.currentSort = ['title', -1]
  }

  async load () {
    if (!this.crawlerEvents) {
      // first load, bind events
      this.crawlerEvents = beaker.crawler.createEventsStream()
      this.crawlerEvents.addEventListener('crawl-start', this.onCrawlStart.bind(this))
      this.crawlerEvents.addEventListener('crawl-dataset-progress', this.onCrawlDatasetProgress.bind(this))
      this.crawlerEvents.addEventListener('crawl-dataset-finish', this.onCrawlDatasetFinish.bind(this))
      this.crawlerEvents.addEventListener('crawl-error', this.onCrawlError.bind(this))
      this.crawlerEvents.addEventListener('crawl-finish', this.onCrawlFinish.bind(this))
    }

    this.crawlStates = await beaker.crawler.getCrawlStates()
    this.sort()
    this.requestUpdate()
  }

  unload () {
    if (this.crawlerEvents) {
      this.crawlerEvents.close()
      this.crawlerEvents = undefined
    }
  }

  // rendering
  // =

  render () {
    if (!this.crawlStates) {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <div class="crawler-status loading">Loading...</div>
      `
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="crawler-status">
        <div class="crawler-actions">
          <button class="btn small" @click=${this.onClickCrawlAll}>Crawl all drives</button>
          <button class="btn small" @click=${this.onClickResetAll}>Rebuild all indexes</button>
        </div>
        <div class="heading">
          ${this.renderHeading('title', 'Drive')}
          ${this.renderHeading('crawl-state', 'Status')}
        </div>
        ${this.crawlStates.map(row => this.renderStatusRow(row))}
      </div>
    `
  }

  renderHeading (id, label) {
    const icon = this.currentSort[0] === id
      ? this.currentSort[1] > 0
        ? html`<span class="fa fa-angle-up"></span>`
        : html`<span class="fa fa-angle-down"></span>`
      : ''

    return html`
      <div class=${id}>
        <a @click=${e => this.onClickHeading(id)}>${label}</a> ${icon}
      </div>
    `
  }

  renderStatusRow (row) {
    return html`
      <div class="row" @contextmenu=${e => this.onContextmenuRow(e, row)}>
        <a href="${row.url}" target="_blank" class="title">${row.title ? row.title : getHostname(row.url)}</a>
        <span class="crawl-state">
          ${row.error
            ? html`<span class="error">Error!</span>`
            : row.isCrawling
              ? html`
                <div class="progress-ui blue small">
                  <div style="width: ${getProgress(row)}%" class="completed"></div>
                </div>`
              : row.updatedAt
                ? `Last crawled ${niceDate(row.updatedAt)}. ${earliestVersion(row)} updates processed.`
                : '--'}
        </span>
      </div>`
  }

  // events
  // =

  onClickCrawlAll () {
    this.crawlStates.forEach(row => beaker.crawler.crawlSite(row.url))
    toast.create('Crawl triggered')
  }

  async onClickResetAll () {
    if (!confirm('This will delete and redownload all crawled data. Are you sure?')) {
      return
    }
    await Promise.all(this.crawlStates.map(async (row) => {
      await beaker.crawler.resetSite(row.url)
      Object.assign(row, initialState(row.url, row.title, null))
    }))
    toast.create('Index was deleted and will now rebuild')
    this.requestUpdate()
  }

  onClickHeading (id) {
    if (this.currentSort[0] === id) {
      this.currentSort[1] *= -1
    } else {
      this.currentSort[0] = id
      this.currentSort[1] = -1
    }
    this.sort()
    this.requestUpdate()
  }

  async onContextmenuRow (e, row) {
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
        label: 'Crawl drive',
        click: () => {
          beaker.crawler.crawlSite(row.url)
          toast.create('Crawl triggered')
        }
      },
      {
        label: 'Rebuild index',
        click: () => {
          beaker.crawler.resetSite(row.url)
          Object.assign(row, initialState(row.url, row.title, null))
          toast.create('Index was deleted and will now rebuild')
          this.requestUpdate()
        }
      },
      {icon: 'info-circle', label: 'View debug data', click: () => alert(JSON.stringify(row))}
    ]
    await contextMenu.create({x: e.clientX, y: e.clientY, items})
  }

  onCrawlStart ({sourceUrl}) {
    var s = this.getState(sourceUrl)
    if (!s) {
      s = initialState(sourceUrl, null, Date.now())
      this.crawlStates.push(s)
    }
    s.isCrawling = true
    s.error = false
    this.requestUpdate()
  }

  onCrawlDatasetProgress ({sourceUrl, crawlDataset, progress, numUpdates}) {
    var s = this.getState(sourceUrl)
    s.datasetProgress = s.datasetProgress || {}
    s.datasetProgress[crawlDataset] = {progress, numUpdates}
    this.requestUpdate()
  }

  onCrawlDatasetFinish ({sourceUrl, crawlDataset, crawlRange}) {
    var s = this.getState(sourceUrl)
    s.datasetVersions[crawlDataset] = crawlRange.end - 1
    this.requestUpdate
  }

  onCrawlError ({sourceUrl, err}) {
    var s = this.getState(sourceUrl)
    s.error = err
    this.requestUpdate()
  }

  onCrawlFinish ({sourceUrl}) {
    var s = this.getState(sourceUrl)
    s.isCrawling = false
    s.updatedAt = Date.now()
    this.requestUpdate()
  }

  // helpers
  // =

  getState (url) {
    return this.crawlStates.find(s => s.url === url)
  }

  sort () {
    this.crawlStates.sort((a, b) => {
      var v
      switch (this.currentSort[0]) {
        case 'crawl-state': v = a.updatedAt - b.updatedAt; break
        case 'title':
        default:
          v = (b.title || '').localeCompare(a.title || '')
      }
      return v * this.currentSort[1]
    })
  }
}
customElements.define('crawler-settings-view', CrawlerSettingsView)

// internal
// =

function initialState (url, title, updatedAt) {
  return {
    url,
    title,
    datasetVersions: {
      crawl_posts: 0,
      crawl_graph: 0,
      crawl_site_descriptions: 0
    },
    updatedAt
  }
}

function getProgress (s) {
  if (!s.datasetProgress) return 1

  var progress = 0
  var numUpdates = 0
  for (var k in s.datasetProgress) {
    progress += s.datasetProgress[k].progress
    numUpdates += s.datasetProgress[k].numUpdates
  }
  return ((numUpdates === 0) ? 0 : (progress / numUpdates)) * 100
}

function earliestVersion (s) {
  var v
  for (let k in s.datasetVersions) {
    if (typeof v === 'undefined' || v < s.datasetVersions[k]) {
      v = s.datasetVersions[k]
    }
  }
  return v
}