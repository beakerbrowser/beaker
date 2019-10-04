import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import mainCSS from '../css/main.css.js'
import './views/about.js'
import './views/file.js'

export class CommandViewer extends LitElement {
  static get styles () {
    return mainCSS
  }

  constructor () {
    super()
    this.info = undefined
    this.libraryEntry = undefined
    this.load()
  }

  async load () {
    var archive = new DatArchive(location)
    this.info = await archive.getInfo()
    this.libraryEntry = (await uwg.library.list({key: this.info.key, isSaved: true}))[0]
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    if (!this.info) return html``
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="header">
        <h1>${this.info.title}</h1>
        <p class="description">${this.info.description || html`<em>No description</em>`}</p>
        <div>${this.renderSaveBtn()}</div>
      </div>
      ${location.pathname !== '/' ? html`
        <file-view></file-view>
      ` : html`
        <about-view></about-view>
      `}
    `
  }

  renderSaveBtn () {
    const isSaved = !!this.libraryEntry
    return html`
      <button class="${isSaved ? 'primary' : ''}" @click=${this.onToggleSaved}>
        ${isSaved ? html`
          <span class="fas fa-fw fa-check"></span> Installed
        ` : html`
          <span class="fas fa-fw fa-download"></span> Install
        `}
      </button>
    `
  }

  // events
  // =

  async onToggleSaved (e) {
    if (this.libraryEntry) {
      await uwg.library.configure(this.info.url, {isSaved: false})
    } else {
      await uwg.library.configure(this.info.url, {isSaved: true})
    }
    this.load()
  }
}

customElements.define('command-viewer', CommandViewer)