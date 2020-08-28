import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
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
    }
  }

  constructor () {
    super()
    beaker.panes.setAttachable()
    beaker.panes.attachToLastActivePane()
    beaker.browser.getProfile().then(p => {
      this.profile = p
    })

    document.body.addEventListener('click', e => {
      // route navigations to the attached pane if present
      var attachedPane = beaker.panes.getAttachedPane()
      if (!attachedPane) return
      let anchor = findParent(e.path[0], el => el.tagName === 'A')
      if (anchor) {
        if (!e.metaKey && anchor.getAttribute('target') !== '_blank') {
          e.stopPropagation()
          e.preventDefault()
          beaker.panes.navigate(attachedPane.id, anchor.getAttribute('href'))
        }
      }
    })
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <beaker-record-feed
        .index=${['notifications']}
        limit="50"
        show-date-titles
        @view-thread=${this.onViewThread}
        profile-url=${this.profile?.url}
      ></beaker-record-feed>
    `
  }

  // events
  // =

  onViewThread (e) {
    ViewThreadPopup.create({
      recordUrl: e.detail.record.url,
      profileUrl: this.profile?.url
    })
  }
}

customElements.define('notifications-app', NotificationsApp)
