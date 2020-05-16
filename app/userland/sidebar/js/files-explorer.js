import { LitElement, html, css } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

class FilesExplorer extends LitElement {
  static get styles () {
    return css`
    :host {
      display: block;
      background: #223;
    }
    .unsupported {
      padding: 20px;
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

  getContext () {
    if (!this.url || !this.url.startsWith('hyper:')) {
      return ''
    }
    return this.url
  }

  async load (url) {
    this.url = toFolderUrl(url)

    var iframeEl = this.shadowRoot.querySelector('iframe')
    if (iframeEl) {
      let iframeUrl = iframeEl.getAttribute('src')
      try {
        let iframeUrlp = new URL(iframeUrl)
        let ctx = toFolderUrl(`hyper://` + iframeUrlp.pathname.replace(/^(\/)/, ''))
        if (ctx === url) {
          return // dont trigger render, already at the location
        }
      } catch (e) {
        // ignore
        console.log(e)
      }
    }
    
    this.requestUpdate()
  }

  // rendering
  // =

  render () {
    if (!this.url) return html``
    var target
    try {
      let url = new URL(this.url)
      if (url.protocol === 'hyper:') {
        target = url.hostname + url.pathname
      }
    } catch (e) {
      console.error('Failed to parse url', this.url, e)
    }
    if (!target) {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <div class="unsupported">
          <span class="fas fa-fw fa-exclamation-triangle"></span> Must be a <code>hyper://</code> site to explore files.
        </div>
      `
    }
    return html`
      <iframe src="beaker://explorer/${target}"></iframe>
    `
  }
}

customElements.define('files-explorer-app', FilesExplorer)

function toFolderUrl (str) {
  if (!str) return ''
  if (!str.endsWith('/')) {
    return str.split('/').slice(0, -1).join('/') + '/'
  }
  return str
}