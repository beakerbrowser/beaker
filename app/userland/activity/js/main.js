import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { findParent } from 'beaker://app-stdlib/js/dom.js'
import css from '../css/main.css.js'
import 'beaker://app-stdlib/js/com/resource-thread.js'

class ActivityApp extends LitElement {
  static get styles () {
    return [css]
  }

  static get properties () {
    return {
      url: {type: String}
    }
  }

  constructor () {
    super()
    beaker.panes.setAttachable()
    this.url = undefined
    this.profileUrl = undefined

    var ignoreNextAttachEvent = false
    beaker.panes.addEventListener('pane-attached', e => {
      if (!ignoreNextAttachEvent) {
        this.load(beaker.panes.getAttachedPane().url)
      }
      ignoreNextAttachEvent = false
    })
    beaker.panes.addEventListener('pane-detached', e => {
    })
    beaker.panes.addEventListener('pane-navigated', e => {
      if (e.detail.url.startsWith('beaker://desktop')) {
        // special case- open the original item rather than beaker desktop, if possible
        var url = new URLSearchParams(location.search).get('url')
        if (url) return this.load(url)
      }
      this.load(e.detail.url)
    })
    
    this.addEventListener('click', e => {
      let anchor = findParent(e.path[0], el => el.tagName === 'A')
      if (anchor && anchor.getAttribute('href')) {
        e.stopPropagation()
        e.preventDefault()
        if (e.metaKey || anchor.getAttribute('target') === '_blank') {
          window.open(anchor.getAttribute('href'))
        } else {
          let pane = beaker.panes.getAttachedPane()
          if (pane) {
            beaker.panes.navigate(pane.id, anchor.getAttribute('href'))
          } else {
            window.location = anchor.getAttribute('href')
          }
        }
        return
      }
    })

    ;(async () => {
      var url = new URLSearchParams(location.search).get('url')
      var attachedPane = await beaker.panes.attachToLastActivePane()
      ignoreNextAttachEvent = !!attachedPane
      if (url) {
        this.load(url)
      } else {
        if (attachedPane) this.load(attachedPane.url)
      }
    })()
  }

  async load (url) {
    this.url = url
  }

  // rendering
  // =

  render () {
    if (!this.url) {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        todo: detached mode
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <beaker-resource-thread
        resource-url=${this.url}
        profile-url=${this.profileUrl}
      ></beaker-resource-thread>
    `
  }
}

customElements.define('activity-app', ActivityApp)
