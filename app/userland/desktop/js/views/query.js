import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { unsafeHTML } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import queryCSS from '../../css/views/query.css.js'
import { removeMarkdown } from 'beaker://app-stdlib/vendor/remove-markdown.js'
import { shorten, makeSafe, toNiceUrl, toNiceDomain, DRIVE_KEY_REGEX, joinPath } from 'beaker://app-stdlib/js/strings.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'

export class QueryView extends LitElement {
  static get properties () {
    return {
      index: {type: String},
      title: {type: String},
      showDateTitles: {type: Boolean, attribute: 'show-date-titles'},
      sort: {type: String},
      limit: {type: Number},
      filter: {type: String},
      sources: {type: Array},
      results: {type: Array},
      hideEmpty: {type: Boolean, attribute: 'hide-empty'},
      showViewMore: {type: Boolean, attribute: 'show-view-more'},
      queryId: {type: Number, attribute: 'query-id'}
    }
  }

  static get styles () {
    return queryCSS
  }

  constructor () {
    super()
    this.index = undefined
    this.title = ''
    this.showDateTitles = false
    this.sort = 'ctime'
    this.limit = undefined
    this.filter = undefined
    this.sources = undefined
    this.results = undefined
    this.hideEmpty = false
    this.showViewMore = false
    this.activeQuery = undefined
    this.abortController = undefined
  }

  get isLoading () {
    return !this.results || !!this.activeQuery
  }

  async load () {
    this.queueQuery()
  }

  updated (changedProperties) {
    if (typeof this.results === 'undefined') {
      if (!this.activeQuery) {
        this.queueQuery()
      }
      return
    } else if (changedProperties.has('filter') && changedProperties.get('filter') != this.filter) {
      this.queueQuery()
    } else if (changedProperties.has('index') && changedProperties.get('index') != this.index) {
      this.queueQuery()
    } else if (changedProperties.has('sources') && !isArrayEq(this.sources, changedProperties.get('sources'))) {
      this.queueQuery()
    }
  }

  queueQuery () {
    if (!this.activeQuery) {
      this.activeQuery = this.query()
      this.requestUpdate()
    } else {
      if (this.abortController) this.abortController.abort()
      this.activeQuery = this.activeQuery.catch(e => undefined).then(r => {
        this.activeQuery = undefined
        this.queueQuery()
      })
    }
  }

  async query () {
    emit(this, 'load-state-updated')
    this.abortController = new AbortController()
    if (this.filter) {
      this.results = await beaker.indexer.search(this.filter, {
        filter: {index: this.index, site: this.sources},
        limit: this.limit,
        sort: 'ctime',
        reverse: true
        // signal: this.abortController.signal TODO doable?
      })
    } else {
      console.log({
        filter: {index: this.index, site: this.sources},
        limit: this.limit,
        sort: 'ctime',
        reverse: true
        // signal: this.abortController.signal TODO doable?
      })
      this.results = await beaker.indexer.list({
        filter: {index: this.index, site: this.sources},
        limit: this.limit,
        sort: 'ctime',
        reverse: true
        // signal: this.abortController.signal TODO doable?
      })
    }
    console.log(this.results)
    this.activeQuery = undefined
    emit(this, 'load-state-updated')
  }

  onOpenActivity (e, url) {
    e.preventDefault()
    beaker.browser.newPane(`beaker://activity/?url=${url}`)
    // beaker.browser.openUrl(url, {setActive: true, addedPaneUrls: ['beaker://activity/']})
  }

  // rendering
  // =

  render () {
    if (!this.results) {
      return html``
    }
    if (!this.results.length) {
      if (this.hideEmpty) return html``
      return html`
        <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
        ${this.title ? html`<h2 class="results-header"><span>${this.title}</span></h2>` : ''}
        <div class="results empty">
          ${this.filter ? html`
            <span>No matches found for "${this.filter}".</div></span>
          ` : html`
            <span>Click "${this.createLabel}" to get started</div></span>
          `}
        </div>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${this.title ? html`<h2 class="results-header"><span>${this.title}</span></h2>` : ''}
      ${this.renderResults()}
    `
  }

  renderResults () {
    this.lastResultNiceDate = undefined // used by renderDateTitle
    if (!this.filter) {
      return html`
        <div class="results">
          ${repeat(this.results, result => result.href, result => this.renderNormalResult(result))}
        </div>
      `
    }
    return html`
      <div class="results">
        ${repeat(this.results, result => result.href, result => this.renderSearchResult(result))}
      </div>
    `
  }

  renderDateTitle (result) {
    if (!this.showDateTitles) return ''
    var resultNiceDate = dateHeader(result.ctime)
    if (this.lastResultNiceDate === resultNiceDate) return ''
    this.lastResultNiceDate = resultNiceDate
    return html`
      <h2 class="results-header"><span>${resultNiceDate}</span></h2>
    `
  }
  
  renderNormalResult (result) {
    if (['beaker/index/microblogposts', 'beaker/index/comments'].includes(result.index)) {
      return this.renderResultAsCard(result)
    }
    return this.renderResultAsAction(result)
  }

  renderSearchResult (result) {
    var isBookmark = result.index === 'beaker/index/bookmarks'

    var href = undefined
    switch (result.index) {
      case 'beaker/index/comments': href = result.metadata['beaker/subject']; break
      case 'beaker/index/bookmarks': href = result.metadata['beaker/href']; break
    }
    href = href || result.url

    var urlp
    try { urlp = new URL(href) }
    catch (e) { return '' }
    var hostname = DRIVE_KEY_REGEX.test(urlp.hostname) ? `${urlp.hostname.slice(0,6)}..${urlp.hostname.slice(-2)}` : urlp.hostname

    var title = result.metadata['beaker/title'] || ({
      'beaker/index/bookmarks': 'Bookmark',
      'beaker/index/blogposts': 'Blog Post',
      'beaker/index/microblogposts': `Post on ${(new Date(result.ctime)).toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' })}`,
      'beaker/index/pages': 'Page',
      'beaker/index/comments': `Comment on ${toNiceUrl(result.href)}`
    })[result.index] || 'File'

    return html`
      <div class="result row">
        <a class="thumb" href=${href} title=${title}>
          ${this.renderResultThumb(result)}
        </a>
        <div class="info">
          <div class="href">
            <a href=${href}>
              ${hostname}
              ${repeat(urlp.pathname.split('/').filter(Boolean), seg => html`
                <span class="fas fa-fw fa-angle-right"></span> ${seg}
              `)}
            </a>
          </div>
          <div class="title">
            <a href=${result.href}>
              ${renderMatchText(result, 'beaker/title') || title}
            </a>
          </div>
          <div class="origin">
            ${isBookmark ? html`
              <span class="origin-note"><span class="far fa-fw fa-star"></span> Bookmarked by</span>
              <a class="author" href=${result.site.url} title=${result.site.title}>
                ${result.site.url === 'hyper://system/' ? 'Me (Private)' : result.site.title}
              </a>
            ` : (
              result.site.url === 'hyper://system/' ? html`
                <span class="sysicon fas fa-fw fa-lock"></span>
                <a class="author" href=${result.site.url} title=${result.site.title}>
                  Me (Private)
                </a>
              ` : html`
                <img class="favicon" src="${joinPath(result.site.url, 'thumb')}">
                <a class="author" href=${result.site.url} title=${result.site.title}>
                  ${result.site.title}
                </a>
              `)
            }
            <a class="date" href=${href}>${niceDate(result.ctime)}</a>
          </div>
          ${result.content ? html`
            <div class="excerpt">
              ${renderMatchText(result, 'content') || shorten(removeMarkdown(removeFirstMdHeader(result.content)), 300)}
            </div>
          ` : ''}
          ${''/*TODO<div class="tags">
            <a href="#">#beaker</a>
            <a href="#">#hyperspace</a>
            <a href="#">#p2p</a>
          </div>*/}
        </div>
      </a>
    `
  }

  renderResultAsAction (result) {
    var href = undefined
    switch (result.index) {
      case 'beaker/index/comments': href = result.metadata['beaker/subject']; break
      case 'beaker/index/bookmarks': href = result.metadata['beaker/href']; break
    }
    href = href || result.url

    var title = result.metadata['beaker/title'] || ({
      'beaker/index/bookmarks': niceDate(result.ctime),
      'beaker/index/blogposts': niceDate(result.ctime),
      'beaker/index/microblogposts': niceDate(result.ctime),
      'beaker/index/pages': niceDate(result.ctime),
      'beaker/index/comments': shorten(fancyUrl(result.href), 50)
    })[result.index] || niceDate(result.ctime)

    var action = ({
      'beaker/index/bookmarks': 'Bookmarked',
      'beaker/index/blogposts': 'Blogpost created',
      'beaker/index/pages': 'Page created',
      'beaker/index/comments': 'Comment created'
    })[result.index] || 'File created'

    return html`
      ${this.renderDateTitle(result)}
      <div class="result action">
        <a class="thumb" href=${result.site.url} title=${result.site.title} data-tooltip=${result.site.title}>
          <img class="favicon" src="${joinPath(result.site.url, 'thumb')}">
        </a>
        <div class="container">
          <div class="title">
            <a href=${href}>${title}</a>
          </div>
          ${''/*<div class="tags">
            <a href="#">beaker</a>
            <a href="#">hyperspace</a>
            <a href="#">p2p</a>
          </div>*/}
          <div class="ctrls">
            <span class="action">${action}</span>
            by
            <span class="origin">
              <a class="author" href=${result.site.url} title=${result.site.title}>
                ${result.site.url === 'hyper://system/' ? 'Me (Private)' : result.site.title}
              </a>
            </span>
            <a class="ctrl" @click=${e => this.onOpenActivity(e, href)}><span class="far fa-fw fa-comment-alt"></span> <small>Thread</small></a>
            <a class="ctrl"><span class="far fa-fw fa-star"></span><span class="fas fa-fw fa-caret-down"></span></a>
          </div>
        </div>
      </div>
    `
  }

  renderResultAsCard (result) {
    var context = undefined
    switch (result.index) {
      case 'beaker/index/comments':
        context = result.metadata['beaker/subject'] || result.metadata['beaker/parent']
        break
    }

    return html`
      ${this.renderDateTitle(result)}
      <div class="result card">
        <a class="thumb" href=${result.site.url} title=${result.site.title} data-tooltip=${result.site.title}>
          <img class="favicon" src="${joinPath(result.site.url, 'thumb')}">
        </a>
        <span class="arrow"></span>
        <div class="container">
          ${context ? html`
            <div class="context">
              <a href=${context} @click=${e => this.onOpenActivity(e, context)}>
                <span class="fas fa-fw fa-reply"></span> ${shorten(fancyUrl(context), 50)}
              </a>
            </div>
          ` : ''}
          <div class="header">
            <div class="origin">
              ${result.site.url === 'hyper://system/' ? html`
                <a class="author" href=${result.site.url} title=${result.site.title}>I privately</a>
              ` : html`
                <a class="author" href=${result.site.url} title=${result.site.title}>
                  ${result.site.title}
                </a>
              `}
            </div>
            <span>&middot;</span>
            <div class="date">
              <a href=${result.url}>
                ${relativeDate(result.ctime)}
              </a>
            </div>
          </div>
          <div class="content">
            ${unsafeHTML(beaker.markdown.toHTML(result.content))}
          </div>
          ${''/*<div class="tags">
            <a href="#">beaker</a>
            <a href="#">hyperspace</a>
            <a href="#">p2p</a>
          </div>*/}
          <div class="ctrls">
            <a @click=${e => this.onOpenActivity(e, context || result.url)}><span class="far fa-fw fa-comment-alt"></span> <small>Thread</small></a>
            <a><span class="far fa-fw fa-star"></span><span class="fas fa-fw fa-caret-down"></span></a>
          </div>
        </div>
      </div>
    `
  }

  renderResultThumb (result, url = undefined) {
    url = url || result.url
    if (url && /\.(png|jpe?g|gif)$/.test(url)) {
      return html`<img src=${url}>`
    }
    var icon = 'far fa-file-alt'
    switch (result.index) {
      case 'beaker/index/blogposts': icon = 'fas fa-blog'; break
      case 'beaker/index/pages': icon = 'far fa-file-alt'; break
      case 'beaker/index/bookmarks': icon = 'fas fa-star'; break
      case 'beaker/index/microblogposts': icon = 'fas fa-stream'; break
      case 'beaker/index/comments': icon = 'far fa-comment'; break
    }
    return html`
      <span class="icon">
        <span class="fa-fw ${icon}"></span>
      </span>
    `
  }
  // events
  // =

}

customElements.define('query-view', QueryView)

function renderMatchText (result, key) {
  var match = result.matches.find(m => m.key === key)
  if (!match) return undefined
  return unsafeHTML(makeSafe(removeMarkdown(match.value, {keepHtml: true})).replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>'))
}

function isArrayEq (a, b) {
  if (!a && !!b) return false
  if (!!a && !b) return false
  return a.sort().toString() == b.sort().toString() 
}

function removeFirstMdHeader (str = '') {
  return str.replace(/(^#\s.*\r?\n)/, '').trim()
}

function fancyUrl (str) {
  try {
    let url = new URL(str)
    let parts = [toNiceDomain(url.hostname)].concat(url.pathname.split('/').filter(Boolean))
    return parts.join(' › ')
  } catch (e) {
    return str
  }
}

async function veryFancyUrl (str) {
  try {
    let url = new URL(str)
    let domain = (url.protocol === 'hyper:' ? await getDriveTitle(url.hostname) : undefined) || toNiceDomain(url.hostname)
    let parts = [domain].concat(url.pathname.split('/').filter(Boolean))
    return parts.join(' › ')
  } catch (e) {
    return str
  }
}

const today = (new Date()).toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' })
const yesterday = (new Date(Date.now() - 8.64e7)).toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' })
const lastWeekTs = Date.now() - 6.048e+8
function niceDate (ts, {largeIntervals} = {largeIntervals: false}) {
  var date = (new Date(ts)).toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' })
  if (date === today) return 'Today'
  if (date === yesterday) return 'Yesterday'
  if (largeIntervals) {
    if (ts > lastWeekTs) return 'This Week'
    return (new Date(ts)).toLocaleDateString('default', { year: 'numeric', month: 'long' })
  }
  return date
}

function dateHeader (ts) {
  var date = (new Date(ts)).toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' })
  if (date === today) return 'Today'
  if (date === yesterday) return 'Yesterday'
  return (new Date(ts)).toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

const todayMs = Date.now()
const rtf = new Intl.RelativeTimeFormat('en', {numeric: 'auto'})
const MINUTE = 1e3 * 60
const HOUR = 1e3 * 60 * 60
const DAY = HOUR * 24
const MONTH = DAY * 30
function relativeDate (d) {
  var diff = todayMs - d
  if (diff < HOUR) return rtf.format(Math.floor(diff / MINUTE * -1), 'minute')
  if (diff < DAY) return rtf.format(Math.floor(diff / HOUR * -1), 'hour')
  if (diff < MONTH) return rtf.format(Math.floor(diff / DAY * -1), 'day')
  if (diff < MONTH * 3) return rtf.format(Math.floor(diff / (DAY * 7) * -1), 'week')
  if (diff < MONTH * 12) return rtf.format(Math.floor(diff / MONTH * -1), 'month')
  return rtf.format(Math.floor(diff / (MONTH * -12)), 'year')
}

let _driveTitleCache = {}
async function getDriveTitle (url) {
  if (_driveTitleCache[url]) return _driveTitleCache[url]
  _driveTitleCache[url] = beaker.hyperdrive.getInfo(url).then(info => info.title)
  return _driveTitleCache[url]
}
