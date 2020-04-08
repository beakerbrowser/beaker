/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'

class BookmarksMenu extends LitElement {
  static get properties () {
    return {
    }
  }

  constructor () {
    super()
    this.bookmarks = []
  }

  reset () {
    this.bookmarks = []
  }

  async init () {
    this.bookmarks = await bg.bookmarks.list({sortBy: 'title'})
    this.bookmarks.sort((a, b) => (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase()))
    await this.requestUpdate()
  }

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <h2>Bookmarks</h2>
        </div>
        <div class="section scrollable">
          ${this.bookmarks.map(b => html`
            <div class="menu-item" @click=${e => this.onOpenPage(e, b.href)}>
              <img class="favicon" src="asset:favicon:${b.href}">
              <span class="label">${b.title}</span>
            </div>
          `)}
        </div>
      </div>`
  }

  // events
  // =

  onOpenPage (e, url) {
    bg.shellMenus.createTab(url)
    bg.shellMenus.close()
  }
}
BookmarksMenu.styles = [commonCSS, css`
.wrapper {
  width: 250px;
}

.wrapper::-webkit-scrollbar {
  display: none;
}

.section:last-child {
  border-bottom: 0;
}

.section.scrollable {
  max-height: 500px;
  overflow-y: auto;
}

.menu-item {
  height: 40px;
}
`]

customElements.define('bookmarks-menu', BookmarksMenu)