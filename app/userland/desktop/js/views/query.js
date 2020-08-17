import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { unsafeHTML } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import { asyncReplace } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/async-replace.js'
import { SitesListPopup } from '../com/sites-list-popup.js'
import queryCSS from '../../css/views/query.css.js'
import { removeMarkdown } from 'beaker://app-stdlib/vendor/remove-markdown.js'
import { shorten, makeSafe, toNiceDomain, pluralize, joinPath } from 'beaker://app-stdlib/js/strings.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'

const DEFAULT_SEARCH_INDEXES = [
  'beaker/index/blogposts',
  'beaker/index/bookmarks',
  'beaker/index/comments',
  'beaker/index/microblogposts',
  'beaker/index/pages'
]

export class QueryView extends LitElement {
  static get properties () {
    return {
      index: {type: Array},
      title: {type: String},
      showDateTitles: {type: Boolean, attribute: 'show-date-titles'},
      dateTitleRange: {type: String, attribute: 'date-title-range'},
      sort: {type: String},
      limit: {type: Number},
      filter: {type: String},
      sources: {type: Array},
      results: {type: Array},
      hideEmpty: {type: Boolean, attribute: 'hide-empty'},
      profileUrl: {type: String}
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
    this.dateTitleRange = undefined
    this.sort = 'ctime'
    this.limit = undefined
    this.filter = undefined
    this.sources = undefined
    this.results = undefined
    this.hideEmpty = false
    this.profileUrl = ''

    // query state
    this.activeQuery = undefined
    this.abortController = undefined

    // helper state
    this.lastQueryTime = undefined
    this.isMouseDown = false
    this.isMouseDragging = false
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
    } else if (changedProperties.has('index') && !isArrayEq(this.index, changedProperties.get('index'))) {
      this.results = undefined // clear results while loading
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
    var startTs = Date.now()
    var results = []
    if (this.index?.[0] === 'notifications') {
      results = await beaker.indexer.listNotifications({
        filter: {search: this.filter},
        limit: this.limit,
        sort: 'ctime',
        reverse: true
      })
    } else if (this.filter) {
      results = await beaker.indexer.search(this.filter, {
        filter: {index: this.index || DEFAULT_SEARCH_INDEXES, site: this.sources},
        limit: this.limit,
        sort: 'ctime',
        reverse: true
      })
    } else {
      // because we collapse results, we need to run the query until the limit is fulfilled
      let offset = 0
      do {
        let subresults = await beaker.indexer.list({
          filter: {index: this.index, site: this.sources},
          limit: this.limit,
          offset,
          sort: 'ctime',
          reverse: true
        })
        if (subresults.length === 0) break
        
        offset += subresults.length
        subresults = subresults.reduce(reduceMultipleActions, [])
        results = results.concat(subresults)
      } while (results.length < this.limit)
    }
    console.log(results)
    this.lastQueryTime = Date.now() - startTs
    this.results = results
    this.activeQuery = undefined
    emit(this, 'load-state-updated')
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
          ${repeat(this.results, result => result.url, result => this.renderNormalResult(result))}
        </div>
      `
    }
    const searchLink = (label, url) => {
      return html`
        <a class="search-engine" title=${label} href=${url} data-tooltip=${label}>
          <img src="beaker://assets/search-engines/${label.toLowerCase()}.png">
        </a>
      `
    }
    return html`
      ${this.lastQueryTime ? html`
        <div class="bragging">
          Query executed in ${this.lastQueryTime / 1e3} seconds
          &nbsp;|&nbsp;
          Try your search on:
          ${searchLink('DuckDuckGo', `https://duckduckgo.com?q=${encodeURIComponent(this.filter)}`)}
          ${searchLink('Google', `https://google.com/search?q=${encodeURIComponent(this.filter)}`)}
          ${searchLink('Twitter', `https://twitter.com/search?q=${encodeURIComponent(this.filter)}`)}
          ${searchLink('Reddit', `https://reddit.com/search?q=${encodeURIComponent(this.filter)}`)}
          ${searchLink('GitHub', `https://github.com/search?q=${encodeURIComponent(this.filter)}`)}
          ${searchLink('YouTube', `https://www.youtube.com/results?search_query=${encodeURIComponent(this.filter)}`)}
          ${searchLink('Wikipedia', `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(this.filter)}`)}
        </div>
      ` : ''}
      <div class="results">
        ${repeat(this.results, result => result.url, result => this.renderSearchResult(result))}
      </div>
    `
  }

  renderDateTitle (result) {
    if (!this.showDateTitles) return ''
    var resultNiceDate = dateHeader(result.ctime, this.dateTitleRange)
    if (this.lastResultNiceDate === resultNiceDate) return ''
    this.lastResultNiceDate = resultNiceDate
    return html`
      <h2 class="results-header"><span>${resultNiceDate}</span></h2>
    `
  }
  
  renderNormalResult (result) {
    switch (result.index) {
      case 'beaker/index/microblogposts':
      case 'beaker/index/comments':
        return this.renderResultAsCard(result)
      case 'beaker/index/subscriptions':
        return this.renderResultAsAction(result)
      default:
        return this.renderResultAsLink(result)
    }
  }

  renderSearchResult (result) {
    if (['beaker/index/microblogposts', 'beaker/index/comments'].includes(result.index)) {
      return this.renderResultAsCard(result)
    }

    var isBookmark = result.index === 'beaker/index/bookmarks'
    var href = undefined
    switch (result.index) {
      case 'beaker/index/bookmarks': href = result.metadata.href; break
    }
    href = href || result.url
    var title = result.metadata.title || result.url.split('/').pop()
    return html`
      <div class="result row">
        <a class="thumb" href=${href} title=${result.site.title}>
          ${this.renderResultThumb(result)}
        </a>
        <div class="info">
          <div class="title"><a href=${href}>${renderMatchText(result, 'title') || title}</a></div>
          <div class="origin">
            ${isBookmark ? html`
              <span class="origin-note"><span class="far fa-fw fa-star"></span> Bookmarked by</span>
              <a class="author" href=${result.site.url} title=${result.site.title}>
                ${result.site.url === 'hyper://private/' ? 'Me (Private)' : result.site.title}
              </a>
            ` : (
              result.site.url === 'hyper://private/' ? html`
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
            <span>|</span>
            <a class="date" href=${href}>${niceDate(result.ctime)}</a>
            <span>|</span>
            <a class="ctrl" @click=${e => this.onOpenActivity(e, href)} data-tooltip="View Thread">
              comments
            </a>
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
    var action = ({
      'beaker/index/subscriptions': 'subscribed to'
    })[result.index] || 'did something? to'

    return html`
      ${this.renderDateTitle(result)}
      <div
        class=${classMap({
          result: true,
          action: true,
          'is-notification': !!result.notification,
          unread: !!result.notification && !result?.notification?.isRead
        })}
      >
        <a class="thumb" href=${result.site.url} title=${result.site.title} data-tooltip=${result.site.title}>
          <img class="favicon" src="${joinPath(result.site.url, 'thumb')}">
        </a>
        <a class="author" href=${result.site.url} title=${result.site.title}>
          ${result.site.url === 'hyper://private' ? 'I (privately)' : result.site.title}
        </a>
        <span class="action">${action}</span>
        <a class="subject" href=${result.metadata.href} title=${result.metadata.title || result.metadata.href}>
          ${result.metadata.href === this.profileUrl ? 'you' : result.metadata.title || result.metadata.href}
        </a>
        ${result.mergedItems ? html`
          <span>and</span>
          <a
            class="others"
            href="#"
            data-tooltip=${shorten(result.mergedItems.map(r => r.metadata.title || 'Untitled').join(', '), 100)}
            @click=${e => this.onClickShowSites(e, result.mergedItems)}
          >${result.mergedItems.length} other ${pluralize(result.mergedItems.length, 'site')}</a>
        ` : ''}
      </div>
    `
  }

  renderResultAsLink (result) {
    var href = undefined
    switch (result.index) {
      case 'beaker/index/comments': href = result.metadata['beaker/subject']; break
      case 'beaker/index/bookmarks': href = result.metadata.href; break
    }
    href = href || result.url

    var hrefp
    if (result.index === 'beaker/index/bookmarks' && href) {
      try {
        hrefp = new URL(href)
      } catch {}
    }

    var title = result.metadata['title'] || ({
      'beaker/index/bookmarks': niceDate(result.ctime),
      'beaker/index/blogposts': niceDate(result.ctime),
      'beaker/index/microblogposts': niceDate(result.ctime),
      'beaker/index/pages': niceDate(result.ctime),
      'beaker/index/comments': niceDate(result.ctime)
    })[result.index] || result.url.split('/').pop() || niceDate(result.ctime)

    var action = ({
      'beaker/index/bookmarks': 'Bookmark',
      'beaker/index/blogposts': 'Blogpost',
      'beaker/index/comments': 'Comment',
      'beaker/index/pages': 'Page'
    })[result.index] || 'File created'

    return html`
      ${this.renderDateTitle(result)}
      ${result.notification ? this.renderNotification(result) : ''}
      <div
        class=${classMap({
          result: true,
          link: true,
          'is-notification': !!result.notification,
          unread: !!result.notification && !result?.notification?.isRead
        })}
      >
        <a class="thumb" href=${result.site.url} title=${result.site.title} data-tooltip=${result.site.title}>
          <img class="favicon" src="${joinPath(result.site.url, 'thumb')}">
        </a>
        <div class="container">
          <div class="title">
            <a class="link-title" href=${href}>${title}</a>
            ${hrefp ? html`
              <a class="link-origin" href=${hrefp.origin}>${toNiceDomain(hrefp.hostname)}</a>
            ` : ''}
          </div>
          <div class="ctrls">
            ${result.index === 'beaker/index/bookmarks' ? html`<span class="far fa-star"></span>` : ''}
            ${result.index === 'beaker/index/pages' ? html`<span class="far fa-file"></span>` : ''}
            ${result.index === 'beaker/index/blogposts' ? html`<span class="fas fa-blog"></span>` : ''}
            <span class="action">${action}</span>
            by
            <span class="origin">
              <a class="author" href=${result.site.url} title=${result.site.title}>
                ${result.site.url === 'hyper://private' ? 'Me (Privately)' : result.site.title}
              </a>
            </span>
            &middot;
            <span class="date">
              <a href=${result.url} data-tooltip=${(new Date(result.ctime)).toLocaleString()}>
                ${relativeDate(result.ctime)}
              </a>
            </span>
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
      ${result.notification ? this.renderNotification(result) : ''}
      <div
        class=${classMap({
          result: true,
          card: true,
          'is-notification': !!result.notification,
          unread: !!result.notification && !result?.notification?.isRead
        })}
      >
        <a class="thumb" href=${result.site.url} title=${result.site.title} data-tooltip=${result.site.title}>
          <img class="favicon" src="${joinPath(result.site.url, 'thumb')}">
        </a>
        <span class="arrow"></span>
        <div
          class="container"
          @mousedown=${this.onMousedownCard}
          @mouseup=${e => this.onMouseupCard(e, context || result.url)}
          @mousemove=${this.onMousemoveCard}
        >
          <div class="header">
            <div class="origin">
              ${result.site.url === 'hyper://private/' ? html`
                <a class="author" href=${result.site.url} title=${result.site.title}>I privately</a>
              ` : html`
                <a class="author" href=${result.site.url} title=${result.site.title}>
                  ${result.site.title}
                </a>
              `}
            </div>
            <span>&middot;</span>
            <div class="date">
              <a href=${result.url} data-tooltip=${(new Date(result.ctime)).toLocaleString()}>
                ${relativeDate(result.ctime)}
              </a>
            </div>
            ${context ? html`
              <div class="context">
                <span class="fas fa-fw fa-reply"></span>
                <a href=${context}>
                  ${asyncReplace(veryFancyUrlStream(context))}
                </a>
              </div>
            ` : ''}
          </div>
          <div class="content">
            ${renderMatchText(result, 'content') || unsafeHTML(beaker.markdown.toHTML(result.content))}
          </div>
          ${''/*TODO <div class="tags">
            <a href="#">beaker</a>
            <a href="#">hyperspace</a>
            <a href="#">p2p</a>
          </div>
          <div class="ctrls">
            <a><span class="far fa-fw fa-star"></span><span class="fas fa-fw fa-caret-down"></span></a>
            <a @click=${e => this.onOpenActivity(e, context || result.url)}><span class="far fa-fw fa-comment-alt"></span> <small>Thread</small></a>
          </div>*/}
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

  renderNotification (result) {
    var description = ({
      'beaker/notification/bookmark': 'bookmarked',
      'beaker/notification/comment': 'commented on',
      'beaker/notification/mention': 'mentioned',
      'beaker/notification/reply': 'replied to'
    })[result.notification.type] || 'linked to'
    var where = ({
      'beaker/index/pages': 'in',
      'beaker/index/blogpostss': 'in'
    })[result.index] || ''
    return html`
      <div class="notification">
        ${result.site.title}
        ${description}
        <a href=${result.notification.subject}>
          ${asyncReplace(getNotificationSubjectStream(result.notification.subject, this.profileUrl))}
        </a>
        ${where}
      </div>
    `
  }

  // events
  // =

  onOpenActivity (e, url) {
    e.preventDefault()
    beaker.browser.newPane(`beaker://activity/?url=${url}`, {replaceSameOrigin: true})
    // beaker.browser.openUrl(url, {setActive: true, addedPaneUrls: [`beaker://activity/?url=${url}`]})
  }

  onMousedownCard (e) {
    for (let el of e.path) {
      if (el.tagName === 'A') return
    }
    this.isMouseDown = true
    this.isMouseDragging = false
  }

  onMousemoveCard (e) {
    if (this.isMouseDown) {
      this.isMouseDragging = true
    }
  }

  onMouseupCard (e, url) {
    if (!this.isMouseDown) return
    if (!this.isMouseDragging) {
      this.onOpenActivity(e, url)
    }
    this.isMouseDown = false
    this.isMouseDragging = false
  }

  onClickShowSites (e, results) {
    e.preventDefault()
    SitesListPopup.create(results)
  }
}

customElements.define('query-view', QueryView)

function renderMatchText (result, key) {
  if (!result.matches) return undefined
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

async function* veryFancyUrlStream (url) {
  yield fancyUrl(url)
  yield veryFancyUrl(url)
}

var _notificationSubjectCache = {}
async function getNotificationSubject (url) {
  if (_notificationSubjectCache[url]) {
    return _notificationSubjectCache[url]
  }
  try {
    let item = await beaker.indexer.get(url)
    if (item.metadata.title) {
      return `"${item.metadata.title}"`
    }
    switch (item.index) {
      case 'beaker/index/comments': return 'your comment'
      case 'beaker/index/pages': return 'your page'
      case 'beaker/index/blogposts': return 'your blog post'
      case 'beaker/index/microblogposts': return 'your post'
    }
  } catch {}
  return 'your page'
}

async function* getNotificationSubjectStream (url, profileUrl) {
  if (isRootUrl(url)) {
    if (url === profileUrl) {
      yield 'you'
    } else {
      yield 'your site'
    }
  } else {
    yield await getNotificationSubject(url)
  }
}

function isRootUrl (url) {
  try {
    return (new URL(url)).pathname === '/'
  } catch {
    return false
  }
}

const today = (new Date()).toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' })
const yesterday = (new Date(Date.now() - 8.64e7)).toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' })
function niceDate (ts, {largeIntervals} = {largeIntervals: false}) {
  var date = (new Date(ts)).toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' })
  if (date === today) return 'Today'
  if (date === yesterday) return 'Yesterday'
  if (largeIntervals) {
    return (new Date(ts)).toLocaleDateString('default', { year: 'numeric', month: 'long' })
  }
  return date
}

const MINUTE = 1e3 * 60
const HOUR = 1e3 * 60 * 60
const DAY = HOUR * 24

function dateHeader (ts, range) {
  const endOfTodayMs = +((new Date).setHours(23,59,59,999))
  var diff = endOfTodayMs - ts
  if (diff < DAY) return 'Today'
  if (diff < DAY * 6) return (new Date(ts)).toLocaleDateString('default', { weekday: 'long' })
  if (range === 'month') return (new Date(ts)).toLocaleDateString('default', { month: 'short', year: 'numeric' })
  return (new Date(ts)).toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })
}

const rtf = new Intl.RelativeTimeFormat('en', {numeric: 'auto'})
function relativeDate (d) {
  const nowMs = Date.now()
  const endOfTodayMs = +((new Date).setHours(23,59,59,999))
  var diff = nowMs - d
  var dayDiff = Math.floor((endOfTodayMs - d) / DAY)
  if (diff < HOUR) return rtf.format(Math.ceil(diff / MINUTE * -1), 'minute')
  if (dayDiff < 1) return rtf.format(Math.ceil(diff / HOUR * -1), 'hour')
  if (dayDiff <= 30) return rtf.format(dayDiff * -1, 'day')
  if (dayDiff <= 365) return rtf.format(Math.floor(dayDiff / 30) * -1, 'month')
  return rtf.format(Math.floor(dayDiff / 365) * -1, 'year')
}

let _driveTitleCache = {}
async function getDriveTitle (url) {
  if (_driveTitleCache[url]) return _driveTitleCache[url]
  _driveTitleCache[url] = beaker.hyperdrive.getInfo(url).then(info => info.title)
  return _driveTitleCache[url]
}

function reduceMultipleActions (acc, result) {
  let last = acc[acc.length - 1]
  if (last) {
    if (last.site.url === result.site.url && result.index === 'beaker/index/subscriptions') {
      last.mergedItems = last.mergedItems || []
      last.mergedItems.push(result)
      return acc
    }
  }
  acc.push(result)
  return acc
}