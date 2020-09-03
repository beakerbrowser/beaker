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
    this.results = []

    window.init = () => this.load()
    window.reset = () => {} // TODO

    beaker.browser.getProfile().then(p => {
      this.profile = p
    })

    // global event listeners
    window.addEventListener('blur', e => {
      beaker.browser.toggleNotifications(false)
      this.reset()
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

  async load () {
    this.profile = await beaker.browser.getProfile()
    var results = await beaker.index.listRecords({
      notification: true,
      limit: 100,
      sort: 'rtime',
      reverse: true
    })
    this.results = results
  }

  getActionTarget (result) {
    let url = result.notification.subject
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
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="results">
        ${repeat(this.results, result => result.url, result => this.renderResult(result))}
      </div>
    `
  }

  renderResult (result) {
    return html`
      <beaker-record
        class=${result.notification.unread ? 'unread' : ''}
        .record=${result}
        action-target=${this.getActionTarget(result)}
        render-mode="action"
        thread-view
        profile-url=${this.profile?.url}
      ></beaker-record>
    `
  }

  // events
  // =

  onLoad () {
    setTimeout(async () => {
      await beaker.index.clearNotifications()
    }, 3e3)
  }

  onViewThread (e) {
    ViewThreadPopup.create({
      recordUrl: e.detail.record.url,
      profileUrl: this.profile?.url
    })
  }
}

customElements.define('notifications-app', NotificationsApp)
