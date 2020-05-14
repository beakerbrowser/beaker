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
    this.isInstalled = undefined
    this.load()
  }

  async load () {
    var drive = beaker.hyperdrive.drive(location)
    this.info = await drive.getInfo()
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
        <div class="description">${this.info.description || html`<em>No description</em>`}</div>
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
    if (location.protocol === 'beaker:') {
      return html`<div style="margin-top: 10px"><small><span class="fas fa-check"></span> Builtin (cannot be uninstalled)</button></small></div>`
    }
    return undefined
    /* TODO
    return html`
      <button class="${this.isInstalled ? 'primary' : ''}" @click=${this.onToggleInstalled}>
        ${this.isInstalled ? html`
          <span class="fas fa-fw fa-check"></span> Installed
        ` : html`
          <span class="fas fa-fw fa-download"></span> Install
        `}
      </button>
    `*/
  }

  // events
  // =

  async onToggleInstalled (e) {
    if (this.isInstalled) {
      // await beaker.programs.uninstallProgram(this.info.url)
    } else {
      // await beaker.programs.installProgram(this.info.url)
    }
    this.load()
  }
}

customElements.define('command-viewer', CommandViewer)