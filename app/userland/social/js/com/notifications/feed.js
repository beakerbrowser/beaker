import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import { repeat } from '../../../vendor/lit-element/lit-html/directives/repeat.js'
import * as notificationsIndex from '../../lib/notifications.js'
import * as uwg from '../../lib/uwg.js'
import { toNiceUrl } from '../../lib/strings.js'
import { timeDifference } from '../../lib/time.js'
import feedCSS from '../../../css/com/notifications/feed.css.js'
import '../paginator.js'

const PAGE_SIZE = 50

export class NotificationsFeed extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      notifications: {type: Array}
    }
  }

  static get styles () {
    return feedCSS
  }

  constructor () {
    super()
    this.user = undefined
    this.notifications = undefined
    this.page = 0
  }

  async load () {
    var notifications = await notificationsIndex.list({
      offset: this.page * PAGE_SIZE,
      limit: PAGE_SIZE
    })
    /* dont await */ this.loadFeedInformation(notifications)
    this.notifications = notifications
    console.log(this.notifications)
  }

  async loadFeedInformation (notifications) {
    for (let notification of notifications) {
      try {
        let [authorProfile, targetContent] = await Promise.all([
          uwg.profiles.get(notification.author),
          this.fetchTargetContent(notification)
        ])
        notification.authorProfile = authorProfile
        notification.targetContent = targetContent
        this.requestUpdate()
      } catch (e) {
        console.error('Failed to fetch notification content', e)
      }
    }
  }

  fetchTargetContent (notification) {
    if (notification.event === 'comment' || notification.event === 'vote') {
      if (notification.detail.href.includes('/comments/')) {
        let urlp = new URL(notification.detail.href)
        return uwg.comments.get(urlp.origin, urlp.pathname).catch(err => notification.detail.href)
      }
      if (notification.detail.href.includes('/posts/')) {
        let urlp = new URL(notification.detail.href)
        return uwg.posts.get(urlp.origin, urlp.pathname).catch(err => notification.detail.href)
      }
    }
    return 'your content'
  }

  getHref (notification) {
    if (notification.event === 'comment' || notification.event === 'vote') {
      if (notification.detail.href.includes('/comments/')) {
        return `beaker://social/${notification.detail.href.slice('hd://'.length)}`
      }
      if (notification.detail.href.includes('/posts/')) {
        return `beaker://social/${notification.detail.href.slice('hd://'.length)}`
      }
    }
  }

  getIcon (notification) {
    if (notification.event === 'comment') {
      return 'far fa-comment'
    }
    if (notification.event === 'vote') {
      if (notification.detail.vote == -1) {
        return 'fas fa-arrow-down'
      }
      return 'fas fa-arrow-up'
    }
    return ''
  }

  getPastTenseAction (notification) {
    if (notification.event === 'comment') {
      return 'replied to'
    }
    if (notification.event === 'vote') {
      if (notification.detail.vote == -1) {
        return 'downvoted'
      }
      return 'upvoted'
    }
    return 'did something? to'
  }

  getContentType (notification) {
    if (notification.event === 'comment' || notification.event === 'vote') {
      if (notification.detail.href.includes('/comments/')) {
        return 'your comment'
      }
      if (notification.detail.href.includes('/posts/')) {
        return 'your post'
      }
    }
    return 'your content'
  }

  render () {
    return html`
      <link rel="stylesheet" href="/webfonts/fontawesome.css">
      <div class="feed">
        ${typeof this.notifications === 'undefined' ? html`
          <div class="empty">
            <span class="spinner"></span>
          </div>
        ` : html`
          ${repeat(this.notifications, notification => {
            return html`
              <a class="notification ${notification.isRead ? '' : 'unread'}" href=${this.getHref(notification)}>
                <span class="icon">
                  <span class=${this.getIcon(notification)}></span>
                </span>
                <span class="content">
                  <span class="description">
                    <span class="author">${notification.authorProfile ? notification.authorProfile.title : toNiceUrl(notification.author)}</span>
                    ${this.getPastTenseAction(notification)}
                    ${this.getContentType(notification)}
                    ${timeDifference(+notification.timestamp, false, 'ago')}
                  </span>
                  <span class="target">
                    ${typeof notification.targetContent === 'string' ? html`
                      <span class="failed-read">${toNiceUrl(notification.targetContent)}</span>
                    ` : notification.targetContent ? html`
                      ${this.renderTargetContent(notification.targetContent)}
                    ` : html`
                      <span class="spinner"></span>
                    `}
                  </span>
                </span>
              </a>
            `
          })}
          ${this.notifications.length === 0
            ? html`
              <div class="empty">
                <div><span class="fas fa-image"></span></div>
                <div>
                  This is the notifications feed. It will show notifications from users in your network
                </div>
              </div>
            ` : ''}
        `}
        <beaker-paginator
          page=${this.page}
          label="Showing notifications ${(this.page * PAGE_SIZE) + 1} - ${(this.page + 1) * PAGE_SIZE}"
          @change-page=${this.onChangePage}
        ></beaker-paginator>
      </div>
    `
  }
  
  renderTargetContent (targetContent) {
    if (targetContent.path.includes('/posts/')) {
      return html`
        <span class="post">
          ${targetContent.stat.metadata.title}
        </span>
      `
    }
    if (targetContent.path.includes('/comments/')) {
      return html`
        <span class="comment">
          ${targetContent.content}
        </span>
      `
    }
  }

  // events
  // =

  onChangePage (e) {
    this.page = e.detail.page
    this.notifications = undefined
    this.load()
  }
}

customElements.define('beaker-notifications-feed', NotificationsFeed)
