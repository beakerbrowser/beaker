import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { classMap } from '../../vendor/lit-element/lit-html/directives/class-map.js'
import { unsafeHTML } from '../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import { asyncReplace } from '../../vendor/lit-element/lit-html/directives/async-replace.js'
import { SitesListPopup } from './popups/sites-list.js'
import css from '../../css/com/record.css.js'
import { removeMarkdown } from '../../vendor/remove-markdown.js'
import { shorten, makeSafe, toNiceDomain, pluralize, fancyUrlAsync, isSameOrigin } from '../strings.js'
import { getRecordType } from '../records.js'
import { emit } from '../dom.js'
import './post-composer.js'

export class Record extends LitElement {
  static get properties () {
    return {
      record: {type: Object},
      loadRecordUrl: {type: String, attribute: 'record-url'},
      myVote: {type: Object},
      upvoteCount: {type: Number},
      downvoteCount: {type: Number},
      commentCount: {type: Number},
      renderMode: {type: String, attribute: 'render-mode'},
      showContext: {type: Boolean, attribute: 'show-context'},
      constrainHeight: {type: Boolean, attribute: 'constrain-height'},
      profileUrl: {type: String, attribute: 'profile-url'},
      actionTarget: {type: String, attribute: 'action-target'},
      isReplyOpen: {type: Boolean},
      viewContentOnClick: {type: Boolean, attribute: 'view-content-on-click'}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.record = undefined
    this.loadRecordUrl = undefined
    this.myVote = undefined
    this.upvoteCount = 0
    this.downvoteCount = 0
    this.commentCount = 0
    this.renderMode = 'card'
    this.showContext = false
    this.constrainHeight = false
    this.profileUrl = undefined
    this.actionTarget = undefined
    this.isReplyOpen = false
    this.viewContentOnClick = false

    // helper state
    this.hasLoadedSignals = false
    this.isMouseDown = false
    this.isMouseDragging = false
  }

  updated (changedProperties) {
    if ((!this.record && this.loadRecordUrl) || changedProperties.has('loadRecordUrl') && changedProperties.get('loadRecordUrl') != this.recordUrl) {
      this.load()
    } else if (this.record && !this.hasLoadedSignals) {
      this.loadSignals()
    }
  }

  async load () {
    this.record = await beaker.index.getRecord(this.loadRecordUrl)
  }

  async loadSignals () {
    if (this.hasLoadedSignals) return
    this.hasLoadedSignals = true
    var [votes, commentCount] = await Promise.all([
      beaker.index.listRecords({
        file: {prefix: '/votes', mimetype: 'application/goto'},
        links: this.loadRecordUrl || this.record.url,
      }),
      beaker.index.countRecords({
        file: {prefix: '/comments', mimetype: 'text/markdown'},
        links: this.loadRecordUrl || this.record.url,
      })
    ])
    this.myVote = votes.find(v => isSameOrigin(v.site.url, this.profileUrl) || isSameOrigin(v.site.url, 'hyper://private'))
    this.upvoteCount = (new Set(votes.filter(v => v.metadata['vote/value'] == 1).map(v => v.site.url))).size
    this.downvoteCount = (new Set(votes.filter(v => v.metadata['vote/value'] == -1).map(v => v.site.url))).size
    this.commentCount = commentCount
  }

  // rendering
  // =

  render () {
    if (!this.record) {
      if (this.loadRecordUrl) {
        return html`
          <a class="unknown-link" href=${this.loadRecordUrl}>
            ${asyncReplace(fancyUrlAsync(this.loadRecordUrl))}
          </a>
        `
      }
      return html``
    }
    switch (this.renderMode) {
      case 'card': return this.renderAsCard()
      case 'comment': return this.renderAsComment()
      case 'action': return this.renderAsAction()
      case 'expanded-link': return this.renderAsExpandedLink()
      case 'link':
      default:
        return this.renderResultAsLink()
    }
  }

  renderAsCard () {
    const res = this.record

    var context = undefined
    var contextAction
    switch (getRecordType(res)) {
      case 'comment':
        context = res.metadata['comment/parent'] || res.metadata['comment/subject']
        contextAction = res.metadata['comment/parent'] ? 'reply to' : 'comment on'
        break
    }

    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${res.notification ? this.renderNotification() : ''}
      <div
        class=${classMap({
          record: true,
          card: true,
          'private': res.url.startsWith('hyper://private'),
          'constrain-height': this.constrainHeight,
          'is-notification': !!res.notification,
          unread: res?.notification?.unread
        })}
      >
        <a class="thumb" href=${res.site.url} title=${res.site.title} data-tooltip=${res.site.title}>
          ${res.url.startsWith('hyper://private') ? html`
            <span class="sysicon fas fa-lock"></span>
          ` : html`
            <img class="favicon" src="asset:thumb:${res.site.url}">
          `}
        </a>
        <span class="arrow"></span>
        <div
          class="container"
          @mousedown=${this.onMousedownCard}
          @mouseup=${this.onMouseupCard}
          @mousemove=${this.onMousemoveCard}
        >
          <div class="header">
            <div class="origin">
              ${res.url.startsWith('hyper://private/') ? html`
                <a class="author" href=${res.site.url} title=${res.site.title}>
                  Private
                  ${getRecordType(res)}
                </a>
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
          <div class="content markdown">
            ${renderMatchText(res, 'content') || unsafeHTML(beaker.markdown.toHTML(res.content))}
          </div>
          <div class="ctrls">
            ${this.renderVoteCtrl()}
            ${this.renderCommentsCtrl()}
          </div>
          ${this.showContext && context ? html`
            <div class="context" data-action=${contextAction}>
              <beaker-record
                record-url=${context}
                constrain-height
                noborders
                nothumb
                render-mode="card"
                profile-url=${this.profileUrl}
              ></beaker-record>
            </div>
          ` : ''}
        </div>
      </div>
    `
  }

  renderAsComment () {
    const res = this.record

    var context = undefined
    switch (getRecordType(res)) {
      case 'comment':
        context = res.metadata['comment/subject'] || res.metadata['comment/parent']
        break
    }

    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${res.notification ? this.renderNotification() : ''}
      <div
        class=${classMap({
          record: true,
          comment: true,
          'private': res.url.startsWith('hyper://private'),
          'is-notification': !!res.notification,
          unread: res?.notification?.unread
        })}
      >
        <div class="header">
          <a class="thumb" href=${res.site.url} title=${res.site.title} data-tooltip=${res.site.title}>
            <img class="favicon" src="asset:thumb:${res.site.url}">
          </a>
          <div class="origin">
            ${res.url.startsWith('hyper://private/') ? html`
              <a class="author" href=${res.site.url} title=${res.site.title}>Private comment</a>
            ` : html`
              <a class="author" href=${res.site.url} title=${res.site.title}>
                ${res.site.title}
              </a>
            `}
          </div>
          <div class="date">
            <a href=${res.url} data-tooltip=${(new Date(res.ctime)).toLocaleString()}>
              ${relativeDate(res.ctime)}
            </a>
          </div>
          ${this.showContext && context ? html`
            <span>&middot;</span>
            <div class="context">
              <a href=${context}>
                ${asyncReplace(fancyUrlAsync(context))}
              </a>
            </div>
          ` : ''}
        </div>
        <div class="content markdown">
          ${renderMatchText(res, 'content') || unsafeHTML(beaker.markdown.toHTML(res.content))}
        </div>
        <div class="ctrls">
          ${this.renderVoteCtrl()}
          <a @click=${this.onClickReply}><span class="fas fa-fw fa-reply"></span> <small>Reply</small></a>
        </div>
        ${this.isReplyOpen ? html`
          <beaker-post-composer
            subject=${this.record.metadata['comment/subject'] || this.record.url}
            parent=${this.record.url}
            placeholder="Write your comment"
            @publish=${this.onPublishReply}
            @cancel=${this.onCancelReply}
          ></beaker-post-composer>
        ` : ''}
      </div>
    `
  }

  renderAsAction () {
    const res = this.record
    const rtype = getRecordType(res)
   
    var subject
    if (['subscription', 'vote'].includes(getRecordType(res))) {
      subject = isSameOrigin(res.metadata.href, this.profileUrl) ? 'you' : res.metadata.title || res.metadata.href
    } else {
      if (res.metadata.title) subject = res.metadata.title
      else if (res.content) subject = shorten(removeMarkdown(res.content), 150)
      else subject = fancyUrlAsync(res.url)
    }
    var showContentAfter = ['microblogpost', 'comment'].includes(getRecordType(res))

    return html`
      <div
        class=${classMap({
          record: true,
          action: true,
          'private': res.url.startsWith('hyper://private'),
          'is-notification': !!res.notification,
          unread: res?.notification?.unread
        })}
      >
        <a class="thumb" href=${res.site.url} title=${res.site.title} data-tooltip=${res.site.title}>
          <img class="favicon" src="asset:thumb:${res.site.url}">
        </a>
        <div>
          <a class="author" href=${res.site.url} title=${res.site.title}>
            ${res.site.url === 'hyper://private' ? 'I (private)' : res.site.title}
          </a>
          ${rtype === 'subscription' ? html`
            <span class="action">subscribed to</span>
            <a class="subject" href=${res.metadata.href} title=${subject}>${subject}</a>
          ` : rtype === 'vote' ? html`
            <span class="action">${res.metadata['vote/value'] == -1 ? 'downvoted' : 'upvoted'} ${this.actionTarget}</span>
          ` : rtype === 'bookmark' ? html`
            <span class="action">bookmarked ${this.actionTarget}</span>
          ` : rtype === 'comment' ? html`
            <span class="action">commented on ${this.actionTarget}</span>
          ` : showContentAfter ? html`
            <span class="action">mentioned ${this.actionTarget}</span>
          ` : html`
            <span class="action">mentioned ${this.actionTarget} in</span>
            <a class="subject" href=${res.url}>${typeof subject === 'string' ? subject : asyncReplace(subject)}</a>
          `}
          ${res.mergedItems ? html`
            <span>and</span>
            <a
              class="others"
              href="#"
              data-tooltip=${shorten(res.mergedItems.map(r => r.metadata.title || 'Untitled').join(', '), 100)}
              @click=${e => this.onClickShowSites(e, res.mergedItems)}
            >${res.mergedItems.length} other ${pluralize(res.mergedItems.length, 'site')}</a>
          ` : ''}
          <span class="date">${relativeDate(res.ctime)}</span>
        </div>
      </div>
      ${showContentAfter ? html`
        <div class="action-content">
          <a href=${res.url} title=${subject}>${subject}</a>
        </div>
      ` : ''}
    `
  }

  renderAsExpandedLink () {
    const res = this.record

    var title = res.metadata.title || res.url.split('/').pop()
    var content = res.content
    var isBookmark = false
    var href = undefined
    var recordType = getRecordType(res)
    switch (recordType) {
      case 'bookmark':
        isBookmark = true
        href = res.metadata.href
        break
      case 'comment':
      case 'microblogpost':
        title = removeMarkdown(removeFirstMdHeader(res.content))
        break
    }
    href = href || res.url

    return html`
    <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <div class="record expanded-link ${res.url.startsWith('hyper://private') ? 'private' : ''}">
        <a class="thumb" href=${href} title=${res.site.title}>
          ${this.renderThumb(res)}
        </a>
        <div class="info">
          <div class="title"><a href=${href}>${renderMatchText(res, 'title') || shorten(title, 150)}</a></div>
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
                <img class="favicon" src="asset:thumb:${res.site.url}">
                <a class="author" href=${res.site.url} title=${res.site.title}>
                  ${res.site.title}
                </a>
              `)
            }
            <span>|</span>
            ${recordType === 'bookmark' ? html`<span class="type"><span class="far fa-star"></span> Bookmark</span>` : ''}
            ${recordType === 'page' ? html`<span class="type"><span class="far fa-file"></span> Page</span>` : ''}
            ${recordType === 'blogpost' ? html`<span class="type"><span class="fas fa-blog"></span> Blogpost</span>` : ''}
            ${recordType === 'comment' ? html`<span class="type"><span class="far fa-comments"></span> Comment</span>` : ''}
            ${recordType === 'microblogpost' ? html`<span class="type"><span class="far fa-comment-alt"></span> Post</span>` : ''}
            <span>|</span>
            <a class="date" href=${href}>${niceDate(res.ctime)}</a>
            <span>|</span>
            ${this.renderVoteCtrl()}
            ${this.renderCommentsCtrl()}
          </div>
          ${content ? html`
            <div class="excerpt">
              ${renderMatchText(res, 'content') || shorten(removeMarkdown(removeFirstMdHeader(content)), 300)}
            </div>
          ` : ''}
        </div>
      </a>
    `
  }

  renderResultAsLink () {
    const res = this.record
    var recordType = getRecordType(res)

    var href = undefined
    switch (recordType) {
      case 'comment': href = res.metadata['comment/subject']; break
      case 'bookmark': href = res.metadata.href; break
    }
    href = href || res.url

    var hrefp
    if (recordType === 'bookmark' && href) {
      try {
        hrefp = new URL(href)
      } catch {}
    }

    var title = res.metadata['title'] || ({
      'bookmark': niceDate(res.ctime),
      'blogpost': niceDate(res.ctime),
      'microblogpost': niceDate(res.ctime),
      'page': niceDate(res.ctime),
      'comment': niceDate(res.ctime)
    })[recordType] || res.url.split('/').pop() || niceDate(res.ctime)

    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${res.notification ? this.renderNotification() : ''}
      <div
        class=${classMap({
          record: true,
          link: true,
          'private': res.url.startsWith('hyper://private'),
          'is-notification': !!res.notification,
          unread: res?.notification?.unread
        })}
      >
        <a class="thumb" href=${res.site.url} title=${res.site.title} data-tooltip=${res.site.title}>
          ${res.url.startsWith('hyper://private') ? html`
            <span class="sysicon fas fa-lock"></span>
          ` : html`
            <img class="favicon" src="asset:thumb:${res.site.url}">
          `}
        </a>
        <div class="container">
          <div class="title">
            <a class="link-title" href=${href}>${shorten(title, 500)}</a>
            ${hrefp ? html`
              <a class="link-origin" href=${hrefp.origin}>${toNiceDomain(hrefp.hostname)}</a>
            ` : ''}
          </div>
          <div class="ctrls">
            ${recordType === 'bookmark' ? html`<span class="far fa-star"></span>` : ''}
            ${recordType === 'page' ? html`<span class="far fa-file"></span>` : ''}
            ${recordType === 'blogpost' ? html`<span class="fas fa-blog"></span>` : ''}
            by
            <span class="origin">
              <a class="author" href=${res.site.url} title=${res.site.title}>
                ${res.site.url === 'hyper://private' ? 'Me (Private)' : res.site.title}
              </a>
            </span>
            <span class="date">
              <a href=${res.url} data-tooltip=${(new Date(res.ctime)).toLocaleString()}>
                ${relativeDate(res.ctime)}
              </a>
            </span>
            ${this.renderVoteCtrl()}
            ${this.renderCommentsCtrl()}
          </div>
        </div>
      </div>
    `
  }

  renderThumb (url = undefined) {
    url = url || this.record.url
    if (url && /\.(png|jpe?g|gif)$/.test(url)) {
      return html`<img src=${url}>`
    }
    var icon = 'far fa-file-alt'
    switch (getRecordType(this.record)) {
      case 'blogpost': icon = 'fas fa-blog'; break
      case 'page': icon = 'far fa-file-alt'; break
      case 'bookmark': icon = 'fas fa-star'; break
      case 'microblogpost': icon = 'fas fa-stream'; break
      case 'comment': icon = 'far fa-comment'; break
    }
    return html`
      <span class="icon">
        <span class="fa-fw ${icon}"></span>
      </span>
    `
  }

  renderVoteCtrl () {
    var myVote = this.myVote?.metadata['vote/value']
    return html`
      <span class="vote-ctrl">
        <a class="up ${myVote == 1 ? 'pressed' : ''}" data-tooltip="Upvote" @click=${e => this.onToggleVote(e, 1)}>
          <span class="fas fa-chevron-up"></span>
          <span class="count">${this.upvoteCount}</span>
        </a>
        <a class="down ${myVote == -1 ? 'pressed' : ''}" data-tooltip="Downvote" @click=${e => this.onToggleVote(e, -1)}>
          <span class="fas fa-chevron-down"></span>
          <span class="count">${this.downvoteCount}</span>
        </a>
      </span>
    `
  }

  renderCommentsCtrl () {
    return html`
      <a class="comment-ctrl" @click=${this.onViewThread}>
        <span class="far fa-comment"></span>
        ${this.commentCount}
      </a>
    `
  }

  renderNotification () {
    const res = this.record
    var type = getRecordType(res)
    var description = 'linked to'
    if (res.notification.key === '_link') {
      if (type === 'microblogpost' || type === 'comment') {
        description = 'mentioned'
      }
    } else if (res.notification.key === 'href') {
      if (type === 'bookmark') {
        description = 'bookmarked'
      } else if (type === 'subscription') {
        description = 'subscribed to'
      }
    } else if (res.notification.key === 'comment/subject') {
      description = 'commented on'
    } else if (res.notification.key === 'comment/parent') {
      description = 'replied to'
    }
    var where = ({
      'page': 'in',
      'blogpost': 'in'
    })[type] || ''
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

  onClickReply (e) {
    e.preventDefault()
    this.isReplyOpen = true
  }

  onPublishReply (e) {
    e.preventDefault()
    e.stopPropagation()
    this.isReplyOpen = false
    emit(this, 'publish-reply')
  }

  onCancelReply (e) {
    this.isReplyOpen = false
  }

  onViewThread (e, record) {
    if (!this.viewContentOnClick && e.button === 0 && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      e.stopPropagation()
      emit(this, 'view-thread', {detail: {record: this.record}})
    }
  }

  onMousedownCard (e) {
    for (let el of e.path) {
      if (el.tagName === 'A' || el.tagName === 'BEAKER-POST-COMPOSER') return
    }
    this.isMouseDown = true
    this.isMouseDragging = false
  }

  onMousemoveCard (e) {
    if (this.isMouseDown) {
      this.isMouseDragging = true
    }
  }

  onMouseupCard (e) {
    if (!this.isMouseDown) return
    if (!this.isMouseDragging) {
      e.preventDefault()
      e.stopPropagation()
      emit(this, 'view-thread', {detail: {record: this.record}})
    }
    this.isMouseDown = false
    this.isMouseDragging = false
  }

  onClickShowSites (e, results) {
    e.preventDefault()
    SitesListPopup.create('Subscribed Sites', results.map(r => ({
      url: r.metadata.href,
      title: r.metadata.title || 'Untitled'
    })))
  }

  async onToggleVote (e, value) {
    if (this.myVote) {
      if (this.myVote.metadata['vote/value'] == value) {
        await beaker.hyperdrive.unlink(this.myVote.url)
      } else {
        await beaker.hyperdrive.updateMetadata(this.myVote.url, {'vote/value': value})
      }
    } else {
      var drive = this.record.url.startsWith('hyper://private')
        ? beaker.hyperdrive.drive('hyper://private')
        : beaker.hyperdrive.drive(this.profileUrl)
      await drive.writeFile(`/votes/${Date.now()}.goto`, '', {
        metadata: {
          href: this.record.url,
          'vote/value': value
        }
      })
    }
    this.loadSignals()
  }
}

customElements.define('beaker-record', Record)

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
    let item = await beaker.index.getRecord(url)
    if (item.metadata.title) {
      return `"${item.metadata.title}"`
    }
    switch (getRecordType(item)) {
      case 'comment': return 'your comment'
      case 'page': return 'your page'
      case 'blogpost': return 'your blog post'
      case 'microblogpost': return 'your post'
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