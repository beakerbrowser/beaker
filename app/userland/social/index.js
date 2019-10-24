import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import mainCSS from './css/main.css.js'
// import './js/com/nav.js'
import 'beaker://app-stdlib/js/com/status/feed.js'

export class App extends LitElement {
  static get properties () {
    return {
      currentView: {type: String},
      user: {type: Object}
    }
  }

  static get styles () {
    return mainCSS
  }

  constructor () {
    super()
    this.user = undefined
    this.load()
  }

  async load () {
    if (!this.user) {
      this.user = await navigator.session.get()
    }
    await this.requestUpdate()
    this.shadowRoot.querySelector('beaker-status-feed').load()
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="layout">
        <main>
          <beaker-status-feed .user=${this.user}></beaker-status-feed>
        </main>
      </div>
    `
  }

  // events
  // =
}

customElements.define('app-main', App)