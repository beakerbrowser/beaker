/* globals beaker DatArchive confirm */

import yo from 'yo-yo'
import * as toast from '../toast'
import * as contextMenu from '../context-menu'
import {niceDate} from '../../../lib/time'
import {getHostname} from '../../../lib/strings'
import {writeToClipboard} from '../../../lib/fg/event-handlers'

// globals
// =

var idCounter = 0
var faviconCacheBuster = Date.now()

// exports
// =

export default class CrawlerStatus {
  constructor () {
    this.id = (++idCounter)
    this.crawlStates = null
    this.currentSort = ['title', -1]

    var crawlerEvents = beaker.crawler.createEventsStream()
    crawlerEvents.addEventListener('crawl-start', this.onCrawlStart.bind(this))
    crawlerEvents.addEventListener('crawl-dataset-start', this.onCrawlDatasetStart.bind(this))
    crawlerEvents.addEventListener('crawl-dataset-progress', this.onCrawlDatasetProgress.bind(this))
    crawlerEvents.addEventListener('crawl-dataset-finish', this.onCrawlDatasetFinish.bind(this))
    crawlerEvents.addEventListener('crawl-error', this.onCrawlError.bind(this))
    crawlerEvents.addEventListener('crawl-finish', this.onCrawlFinish.bind(this))
  }

  // loading
  // =

  async load () {
    this.crawlStates = await beaker.crawler.getCrawlStates()
    this.sort()
    this.rerender()
  }

  // rendering
  // =

  // method to render at a place in the page
  // eg yo`<div>${myFilesBrowser.render()}</div>`
  render () {
    if (!this.crawlStates) {
      this.load() // trigger load
      return yo`<div id=${'crawler-status-' + this.id} class="crawler-status loading">Loading...</div>`
    }

    return yo`
      <div id=${'crawler-status-' + this.id} class="crawler-status">
        <div class="archives">
          <div class="heading">
            ${this.renderHeading('title', 'Site')}
            ${this.renderHeading('crawl-state', 'Status')}
          </div>
          ${this.crawlStates.map(row => this.renderStatusRow(row))}
        </div>
      </div>
    `
  }

  // method to re-render in place
  // eg myFilesBrowser.rerender()
  rerender () {
    let el = document.querySelector('#crawler-status-' + this.id)
    if (el) yo.update(el, this.render())
  }

  renderHeading (id, label) {
    const icon = this.currentSort[0] === id
      ? this.currentSort[1] > 0
        ? yo`<span class="fa fa-angle-up"></span>`
        : yo`<span class="fa fa-angle-down"></span>`
      : ''

    return yo`
      <div class=${id}>
        <a onclick=${e => this.onClickHeading(id)}>${label}</a> ${icon}
      </div>
    `
  }

  renderStatusRow (row) {
    return yo`
      <div class="ll-row archive" oncontextmenu=${e => this.onContextmenuRow(e, row)}>
        <img class="favicon" src="beaker-favicon:32,${row.url}?cache=${faviconCacheBuster}" />
        <a href="${row.url}" target="_blank" class="title">${row.title ? row.title : getHostname(row.url)}</a>
        <span class="crawl-state">
          ${row.error
            ? yo`<span class="error">Error!</span>`
            : row.isCrawling
              ? 'Crawling...'
              : row.updatedAt
                ? `Last crawled ${niceDate(row.updatedAt)}. ${earliestVersion(row)} updates processed.`
                : '--'}
        </span>
      </div>`
  }

  // events
  // =

  onClickHeading (id) {
    if (this.currentSort[0] === id) {
      this.currentSort[1] = this.currentSort[1] * -1
    } else {
      this.currentSort[0] = id
      this.currentSort[1] = -1
    }
    this.sort()
    this.rerender()
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
        icon: 'download',
        label: 'Crawl',
        click: () => {
          beaker.crawler.crawlSite(row.url)
          toast.create('Crawl triggered')
        }
      },
      {
        icon: 'eraser',
        label: 'Reset state',
        click: () => {
          beaker.crawler.resetSite(row.url)
          Object.assign(row, initialState(row.url, row.title, null))
          toast.create('Crawled data cleared')
          this.rerender()
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
    this.rerender()
  }

  onCrawlDatasetStart ({sourceUrl}) {
    var s = this.getState(sourceUrl)
    // TODO show user?
  }

  onCrawlDatasetProgress ({sourceUrl}) {
    var s = this.getState(sourceUrl)
    // TODO show user?
  }

  onCrawlDatasetFinish ({sourceUrl, crawlDataset, crawlRange}) {
    var s = this.getState(sourceUrl)
    s.datasetVersions[crawlDataset] = crawlRange.end - 1
    this.rerender
  }

  onCrawlError ({sourceUrl, err}) {
    var s = this.getState(sourceUrl)
    s.error = err
    this.rerender()
  }

  onCrawlFinish ({sourceUrl}) {
    var s = this.getState(sourceUrl)
    s.isCrawling = false
    s.updatedAt = Date.now()
    this.rerender()
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

function initialState (url, title, updatedAt) {
  return {
    url,
    title,
    datasetVersions: {
      crawl_posts: 0,
      crawl_followgraph: 0,
      crawl_site_descriptions: 0
    },
    updatedAt
  }
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