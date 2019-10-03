import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import rawFileViewCSS from '../../css/views/raw-file.css.js'

export class RawFileView extends LitElement {
  static get properties() {
    return {
      user: {type: Object}
    }
  }

  static get styles () {
    return rawFileViewCSS
  }

  constructor () {
    super()
    this.user = undefined
    this.fileExists = undefined
    this.fileContent = undefined
    this.load()
  }

  get type () {
    if (/\.(png|jpe?g|gif)$/.test(location.pathname)) {
      return 'img'
    }
    if (/\.(mp4|webm|mov)$/.test(location.pathname)) {
      return 'video'
    }
    if (/\.(mp3|ogg)$/.test(location.pathname)) {
      return 'audio'
    }
    return 'text'
  }

  async load () {
    try {
      var archive = new DatArchive(location.hostname)
      await archive.stat(location.pathname) // assert the file exists
      this.fileExists = true
      if (this.type === 'text') {
        this.fileContent = await archive.readFile(location.pathname, 'utf8')
      }
    } catch (e) {
      this.fileExists = false
    }
    this.requestUpdate()
  }

  // rendering
  // =

  render () {
    if (!this.fileExists) {
      return html`<h3>File not found</h3>`
    }
    switch (this.type) {
      case 'img':
        return html`
          <h3>${location.pathname}</h3>
          <img src=${window.location}>
        `
      case 'video':
        return html`
          <h3>${location.pathname}</h3>
          <video controls><source src=${window.location}></video>
        `
      case 'audio':
        return html`
          <h3>${location.pathname}</h3>
          <audio controls><source src=${window.location}></audio>
        `
      default:
        return html`
          <h3>${location.pathname}</h3>
          <pre>${this.fileContent}</pre>
        `
    }
  }

  // events
  // =

}

customElements.define('raw-file-view', RawFileView)
