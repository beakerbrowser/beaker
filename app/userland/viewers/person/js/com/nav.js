import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import navCSS from '../../css/com/nav.css.js'

class Nav extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      currentView: {type: String}
    }
  }

  static get styles () {
    return navCSS
  }

  constructor () {
    super()
    this.currentView = ''
  }


  // rendering
  // =

  render () {
    const item = (id, icon, label) => {
      const cls = classMap({
        item: true,
        current: id === this.currentView
      })
      return html`
        <a class=${cls} @click=${e => this.onClick(e, id)}}>
          <span class="fa-fw ${icon || 'no-icon'}"></span>
          <span class="label">${label}</span>
        </a>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${item('statuses', 'far fa-comment-alt', 'Status Updates')}
      ${item('social-graph', 'far fa-user', 'Social Graph')}
      ${item('bookmarks', 'far fa-star', 'Bookmarks')}
      ${item('dats', 'far fa-folder', 'Dat Library')}
    `
  }

  // events
  // =

  onClick (e, view) {
    e.preventDefault()
    emit(this, 'change-view', {bubbles: true, detail: {view}})
  }
}
customElements.define('person-viewer-nav', Nav)