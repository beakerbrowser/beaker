import { LitElement, html, css } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

class FilesExplorer extends LitElement {
  static get properties () {
    return {
      url: {type: String}
    }
  }

  static get styles () {
    return css`
    :host {
      display: block;
      background: #223;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: 0;
      background: #223;
    }
    `
  }

  constructor () {
    super()
    this.url = undefined
  }

  teardown () {
  }

  async load (url) {
    this.url = url
  }



  // rendering
  // =

  render () {
    if (!this.url) return html``
    var target = this.url
    try {
      let url = new URL(target)
      target = url.hostname + url.pathname
    } catch (e) {
      console.error('Failed to parse url', this.url, e)
    }
    return html`
      <iframe src="https://hyperdrive.network/${target}?embed"></iframe>
    `
  }
}

customElements.define('files-explorer-app', FilesExplorer)
