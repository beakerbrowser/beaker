/* globals beaker DatArchive confirm */

import yo from 'yo-yo'
import {niceDate} from '../../../lib/time'
import {getHostname} from '../../../lib/strings'

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
            ${this.renderHeading('title', 'Indexed site')}
            ${this.renderHeading('crawl-state', 'Last crawled')}
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
      <a class="ll-row archive" href="${row.url}" target="_blank" onclick=${e => this.onClickRow(e, row)}>
        <img class="favicon" src="beaker-favicon:32,${row.url}?cache=${faviconCacheBuster}" />
        <span class="title">${row.title ? row.title : yo`<em>Untitled</em>`}</span>
        <span class="url">${getHostname(row.url)}</span>
        <span class="crawl-state">
          ${row.error
            ? yo`<span class="error">Error!</span>`
            : row.isCrawling
              ? 'Crawling...'
              : row.updatedAt
                ? niceDate(row.updatedAt)
                : '--'}
        </span>
      </a>`
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

  onClickRow (e, row) {
    e.preventDefault()
    if (row.error) {
      alert(row.error)
    } else {
      window.open(row.url)
    }
  }

  onCrawlStart ({sourceUrl}) {
    var s = this.getState(sourceUrl)
    if (!s) {
      s = {
        url: sourceUrl,
        title: false,
        datasetVersions: {
          crawl_posts: 0,
          crawl_followgraph: 0,
          crawl_site_descriptions: 0
        },
        updatedAt: Date.now()
      }
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

  onCrawlDatasetFinish ({sourceUrl}) {
    var s = this.getState(sourceUrl)
    // TODO show user?
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