import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import statusesViewCSS from '../../css/views/statuses.css.js'
import * as QP from '../lib/query-params.js'
import { oneof } from '../lib/validation.js'
import { emit } from '../../../app-stdlib/js/dom.js'
import '../../../app-stdlib/js/com/status/feed.js'
import '../com/subview-tabs.js'
import '../hover-menu.js'

const SUBVIEWS = [
  {id: 'feed', label: html`<span class="fas fa-fw fa-list"></span> Feed`},
  {id: 'notifications', label: html`<span class="far fa-fw fa-bell"></span> Notifications`},
]

class StatusesView extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      currentSubview: {type: String}
    }
  }

  static get styles () {
    return statusesViewCSS
  }


  constructor () {
    super()
    this.currentSubview = oneof(QP.getParam('subview'), 'feed', ['feed'])
    this.user = null
  }

  async load () {
    this.shadowRoot.querySelector('beaker-status-feed').load()
  }

  // rendering
  // =

  render () {
    document.title = 'News Feed'
    
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <beaker-status-feed .user=${this.user}></beaker-status-feed>
    `
  }

  // events
  // =

  onChangeSubview (e) {
    this.currentSubview = e.detail.id
    QP.setParams({subview: this.currentSubview})
    this.load()
  }
}
customElements.define('statuses-view', StatusesView)
