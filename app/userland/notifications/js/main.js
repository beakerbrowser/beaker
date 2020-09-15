import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { findParent } from 'beaker://app-stdlib/js/dom.js'
import { ViewThreadPopup } from 'beaker://app-stdlib/js/com/popups/view-thread.js'
import css from '../css/main.css.js'
import 'beaker://app-stdlib/js/com/record-feed.js'

class NotificationsApp extends LitElement {
  static get styles () {
    return [css]
  }

  static get properties () {
    return {
      results: {type: Array}
    }
  }

  constructor () {
    super()
    this.profile = undefined
    this.currentView = 'activity'
    this.results = undefined

    window.init = () => this.load()
    window.reset = () => {}

    beaker.browser.getProfile().then(p => {
      this.profile = p
    })

    // global event listeners
    window.addEventListener('blur', e => {
      beaker.browser.toggleNotifications(false)
    })
    window.addEventListener('contextmenu', e => e.preventDefault())
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        beaker.browser.toggleNotifications(false)
      }
    })
    document.body.addEventListener('click', e => {
      e.stopPropagation()
      e.preventDefault()
      let anchor = findParent(e.path[0], el => el.tagName === 'A')
      if (anchor) {
        if (!e.metaKey && anchor.getAttribute('target') !== '_blank') {
          e.stopPropagation()
          e.preventDefault()
          beaker.browser.openUrl(anchor.getAttribute('href'), {setActive: true})
          beaker.browser.toggleNotifications(false)
        }
      }
    })
  }

  async load (view = 'activity') {
    if (!this.profile) {
      this.profile = await beaker.browser.getProfile()
    }
    this.currentView = view
    this.results = undefined
    if (view === 'activity') {
      this.results = await beaker.index.query({
        notification: true,
        limit: 100,
        sort: 'crtime',
        reverse: true,
        index: ['local', 'network']
      })
    } else if (view === 'subscribers') {
      this.results = await beaker.index.query({
        notification: true,
        file: {prefix: '/subscriptions', extension: '.goto'},
        limit: 100,
        sort: 'crtime',
        reverse: true,
        index: ['local', 'network']
      })
    }
    setTimeout(() => {
      beaker.index.clearNotifications()
    }, 3e3)
  }

  getActionTarget (result) {
    let url = result.notification?.subject
    try {
      let urlp = new URL(url)
      if (/^\/blog\/[^\/]*.md/i.test(urlp.pathname)) {
        return 'your blogpost'
      }
      if (/^\/comments\/[^\/]*.md/i.test(urlp.pathname)) {
        return 'your comment'
      }
      if (/^\/pages\/[^\/]*.md/i.test(urlp.pathname)) {
        return 'your page'
      }
      if (/^\/microblog\/[^\/]*.md/i.test(urlp.pathname)) {
        return 'your post'
      }
      if (this.profile?.url.startsWith(urlp.origin)) {
        return 'you'
      } else {
        return 'your site'
      }
    } catch (e) {
      return 'you'
    }
  }

  // rendering
  // =

  render () {
    const navItem = (id, label) => html`
      <a class=${this.currentView === id ? 'current' : ''} @click=${e => this.onClickNav(e, id)}>${label}</a>
    `
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="heading">
        Notifications
        [
          ${navItem('activity', 'Activity')}
          |
          ${navItem('subscribers', 'Subscribers')}
        ]
      </div>
      <div class="results">
        ${!this.results ? html`<div class="loading"><span class="spinner"></span></div>` : ''}
        ${this.results ?
          html`<div>${repeat(this.results, result => result.url, result => this.renderResult(result))}</div>`
        : ''}
      </div>
    `
  }

  renderResult (result) {
    return html`
      <beaker-record
        class=${result.notification?.unread ? 'unread' : ''}
        .record=${result}
        action-target=${this.getActionTarget(result)}
        render-mode="action"
        thread-view
        noborders
        profile-url=${this.profile?.url}
      ></beaker-record>
    `
  }

  // events
  // =

  onClickNav (e, id) {
    e.preventDefault()
    e.stopPropagation()
    this.load(id)
  }
}

customElements.define('notifications-app', NotificationsApp)
