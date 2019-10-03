import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { until } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/until.js'
import css from '../../css/com/file-display.css.js'

export class FileDisplay extends LitElement {
  static get properties() {
    return {
      pathname: {type: String},
      info: {type: Object}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.pathname = undefined
    this.info = undefined
  }

  async readFile () {
    try {
      var archive = new DatArchive(location)
      return await archive.readFile(this.pathname, 'utf8')
    } catch (e) {
      return e.toString()
    }
  }

  // rendering
  // =

  render () {
    if (/\.(png|jpe?g|gif)$/.test(this.pathname)) {
      return this.renderImage()
    }
    if (/\.(mp4|webm|mov)$/.test(this.pathname)) {
      return this.renderVideo()
    }
    if (/\.(mp3|ogg)$/.test(this.pathname)) {
      return this.renderAudio()
    }
    if (this.info.size > 1_000_000) {
      return html`<div class="too-big">This file is too big to display</div>`
    }
    return html`
      <div class="text">${until(this.readFile(), 'Loading...')}</div>
    `
  }

  renderImage () {
    return html`<img src=${this.pathname}>`
  }

  renderVideo () {
    return html`<video controls><source src=${this.pathname}></video>`
  }

  renderAudio () {
    return html`<audio controls><source src=${this.pathname}></audio>`
  }

  // events
  // =

}

customElements.define('file-display', FileDisplay)