import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { classMap } from '../../vendor/lit-element/lit-html/directives/class-map.js'
import { unsafeHTML } from '../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import { asyncReplace } from '../../vendor/lit-element/lit-html/directives/async-replace.js'
import { SitesListPopup } from './popups/sites-list.js'
import css from '../../css/com/resource.css.js'
import { removeMarkdown } from '../../vendor/remove-markdown.js'
import { shorten, makeSafe, toNiceDomain, pluralize, joinPath } from '../strings.js'
import { emit } from '../dom.js'

export class Resource extends LitElement {
  static get properties () {
    return {
      resource: {type: Object},
      renderMode: {type: String, attribute: 'render-mode'},
      profileUrl: {type: String, attribute: 'profile-url'}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.resource = undefined
    this.renderMode = 'card'
    this.profileUrl = undefined
  }

  // rendering
  // =

  render () {
    switch (this.renderMode) {
      case 'card': return this.renderAsCard()
      case 'action': return this.renderAsAction()
      case 'expanded-link': return this.renderAsExpandedLink()
      case 'link':
      default:
        return this.renderResultAsLink()
    }
  }

  renderAsCard () {
    const res = this.resource

    return html`
      ${res.notification ? this.renderNotification() : ''}
      <div
        class=${classMap({
          resource: true,
          card: true,
          'is-notification': !!res.notification,
          unread: !!res.notification && !res?.notification?.isRead
        })}
      >
        <a class="thumb" href=${res.site.url} title=${res.site.title} data-tooltip=${res.site.title}>
          <img class="favicon" src="${joinPath(res.site.url, 'thumb')}">
        </a>
        <span class="arrow"></span>
        <div class="container">
          <div class="header">
            <div class="origin">
              ${res.site.url === 'hyper://private/' ? html`
                <a class="author" href=${res.site.url} title=${res.site.title}>I privately</a>
              ` : html`
                <a class="author" href=${res.site.url} title=${res.site.title}>
                  ${res.site.title}
                </a>
              `}
            </div>
            <span>&middot;</span>
            <div class="date">
              <a href=${res.url} data-tooltip=${(new Date(res.ctime)).toLocaleString()}>
                ${relativeDate(res.ctime)}
              </a>
            </div>
          </div>
          <div class="content">
            ${renderMatchText(res, 'content') || unsafeHTML(beaker.markdown.toHTML(res.content))}
          </div>
          ${''/*TODO <div class="tags">
            <a href="#">beaker</a>
            <a href="#">hyperspace</a>
            <a href="#">p2p</a>
          </div>*/}
          <div class="ctrls">
            <a @click=${this.onClickReply}><span class="fas fa-fw fa-reply"></span> <small>Reply</small></a>
          </div>
        </div>
      </div>
    `
  }

  renderAsAction () {
    const res = this.resource

    var action = ({
      'beaker/index/subscriptions': 'subscribed to'
    })[res.index] || 'did something? to'

    return html`
      <div
        class=${classMap({
          resource: true,
          action: true,
          'is-notification': !!res.notification,
          unread: !!res.notification && !res?.notification?.isRead
        })}
      >
        <a class="thumb" href=${res.site.url} title=${res.site.title} data-tooltip=${res.site.title}>
          <img class="favicon" src="${joinPath(res.site.url, 'thumb')}">
        </a>
        <a class="author" href=${res.site.url} title=${res.site.title}>
          ${res.site.url === 'hyper://private' ? 'I (privately)' : res.site.title}
        </a>
        <span class="action">${action}</span>
        <a class="subject" href=${res.metadata.href} title=${res.metadata.title || res.metadata.href}>
          ${res.metadata.href === this.profileUrl ? 'you' : res.metadata.title || res.metadata.href}
        </a>
        ${res.mergedItems ? html`
          <span>and</span>
          <a
            class="others"
            href="#"
            data-tooltip=${shorten(res.mergedItems.map(r => r.metadata.title || 'Untitled').join(', '), 100)}
            @click=${e => this.onClickShowSites(e, res.mergedItems)}
          >${res.mergedItems.length} other ${pluralize(res.mergedItems.length, 'site')}</a>
        ` : ''}
      </div>
    `
  }

  renderAsExpandedLink () {
    const res = this.resource

    var isBookmark = res.index === 'beaker/index/bookmarks'
    var href = undefined
    switch (res.index) {
      case 'beaker/index/bookmarks': href = res.metadata.href; break
    }
    href = href || res.url
    var title = res.metadata.title || res.url.split('/').pop()
    return html`
      <div class="resource expanded-link">
        <a class="thumb" href=${href} title=${res.site.title}>
          ${this.renderThumb(res)}
        </a>
        <div class="info">
          <div class="title"><a href=${href}>${renderMatchText(res, 'title') || title}</a></div>
          <div class="origin">
            ${isBookmark ? html`
              <span class="origin-note"><span class="far fa-fw fa-star"></span> Bookmarked by</span>
              <a class="author" href=${res.site.url} title=${res.site.title}>
                ${res.site.url === 'hyper://private/' ? 'Me (Private)' : res.site.title}
              </a>
            ` : (
              res.site.url === 'hyper://private/' ? html`
                <span class="sysicon fas fa-fw fa-lock"></span>
                <a class="author" href=${res.site.url} title=${res.site.title}>
                  Me (Private)
                </a>
              ` : html`
                <img class="favicon" src="${joinPath(res.site.url, 'thumb')}">
                <a class="author" href=${res.site.url} title=${res.site.title}>
                  ${res.site.title}
                </a>
              `)
            }
            <span>|</span>
            <a class="date" href=${href}>${niceDate(res.ctime)}</a>
          </div>
          ${res.content ? html`
            <div class="excerpt">
              ${renderMatchText(res, 'content') || shorten(removeMarkdown(removeFirstMdHeader(res.content)), 300)}
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

  renderResultAsLink () {
    const res = this.resource

    var href = undefined
    switch (res.index) {
      case 'beaker/index/comments': href = res.metadata['beaker/subject']; break
      case 'beaker/index/bookmarks': href = res.metadata.href; break
    }
    href = href || res.url

    var hrefp
    if (res.index === 'beaker/index/bookmarks' && href) {
      try {
        hrefp = new URL(href)
      } catch {}
    }

    var title = res.metadata['title'] || ({
      'beaker/index/bookmarks': niceDate(res.ctime),
      'beaker/index/blogposts': niceDate(res.ctime),
      'beaker/index/microblogposts': niceDate(res.ctime),
      'beaker/index/pages': niceDate(res.ctime),
      'beaker/index/comments': niceDate(res.ctime)
    })[res.index] || res.url.split('/').pop() || niceDate(res.ctime)

    var action = ({
      'beaker/index/bookmarks': 'Bookmark',
      'beaker/index/blogposts': 'Blogpost',
      'beaker/index/comments': 'Comment',
      'beaker/index/pages': 'Page'
    })[res.index] || 'File created'

    return html`
      ${res.notification ? this.renderNotification() : ''}
      <div
        class=${classMap({
          resource: true,
          link: true,
          'is-notification': !!res.notification,
          unread: !!res.notification && !res?.notification?.isRead
        })}
      >
        <a class="thumb" href=${res.site.url} title=${res.site.title} data-tooltip=${res.site.title}>
          <img class="favicon" src="${joinPath(res.site.url, 'thumb')}">
        </a>
        <div class="container">
          <div class="title">
            <a class="link-title" href=${href}>${title}</a>
            ${hrefp ? html`
              <a class="link-origin" href=${hrefp.origin}>${toNiceDomain(hrefp.hostname)}</a>
            ` : ''}
          </div>
          <div class="ctrls">
            ${res.index === 'beaker/index/bookmarks' ? html`<span class="far fa-star"></span>` : ''}
            ${res.index === 'beaker/index/pages' ? html`<span class="far fa-file"></span>` : ''}
            ${res.index === 'beaker/index/blogposts' ? html`<span class="fas fa-blog"></span>` : ''}
            <span class="action">${action}</span>
            by
            <span class="origin">
              <a class="author" href=${res.site.url} title=${res.site.title}>
                ${res.site.url === 'hyper://private' ? 'Me (Privately)' : res.site.title}
              </a>
            </span>
            &middot;
            <span class="date">
              <a href=${res.url} data-tooltip=${(new Date(res.ctime)).toLocaleString()}>
                ${relativeDate(res.ctime)}
              </a>
            </span>
          </div>
        </div>
      </div>
    `
  }

  renderThumb (url = undefined) {
    url = url || this.resource.url
    if (url && /\.(png|jpe?g|gif)$/.test(url)) {
      return html`<img src=${url}>`
    }
    var icon = 'far fa-file-alt'
    switch (this.resource.index) {
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

  renderNotification () {
    const res = this.resource
    var description = ({
      'beaker/notification/bookmark': 'bookmarked',
      'beaker/notification/comment': 'commented on',
      'beaker/notification/mention': 'mentioned',
      'beaker/notification/reply': 'replied to'
    })[res.notification.type] || 'linked to'
    var where = ({
      'beaker/index/pages': 'in',
      'beaker/index/blogpostss': 'in'
    })[res.index] || ''
    return html`
      <div class="notification">
        ${res.site.title}
        ${description}
        <a href=${res.notification.subject}>
          ${asyncReplace(getNotificationSubjectStream(res.notification.subject, this.profileUrl))}
        </a>
        ${where}
      </div>
    `
  }

  // events
  // =

  onClickReply (e, url) {
    e.preventDefault()
    emit(this, 'reply', {detail: {resource: this.resource}})
  }

  onClickShowSites (e, results) {
    e.preventDefault()
    SitesListPopup.create(results)
  }
}

customElements.define('beaker-resource', Resource)

function renderMatchText (result, key) {
  if (!result.matches) return undefined
  var match = result.matches.find(m => m.key === key)
  if (!match) return undefined
  return unsafeHTML(makeSafe(removeMarkdown(match.value, {keepHtml: true})).replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>'))
}

function removeFirstMdHeader (str = '') {
  return str.replace(/(^#\s.*\r?\n)/, '').trim()
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

