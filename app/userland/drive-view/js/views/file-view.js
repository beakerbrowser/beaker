import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { asyncReplace } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/async-replace.js'
import { unsafeHTML } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import css from '../../css/views/file-view.css.js'

class FileView extends LitElement {
  static get properties () {
    return {
      info: {type: Object}
    }

  }
  static get styles () {
    return css
  }

  constructor () {
    super()
    this.drive = beaker.hyperdrive.drive(location)
    this.info = undefined
  }

  render () {
    const pathname = location.pathname
    if (/\.(png|jpe?g|gif|svg|webp)$/i.test(pathname)) {
      return html`<img src=${pathname} title=${pathname}>`
    } else if (/\.(mp4|webm|mov)$/i.test(pathname)) {
      return html`<video controls><source src=${pathname}></video>`
    } else if (/\.(mp3|ogg)$/i.test(pathname)) {
      return html`<audio controls><source src=${pathname}></audio>`
    } else if (/\.(txt|md)$/i.test(pathname)) {
      const loadFile = async function* () {
        yield ''
        let content = await beaker.hyperdrive.readFile(pathname)
        if (pathname.endsWith('.md')) {
          yield html`<div class="markdown">${unsafeHTML(beaker.markdown.toHTML(content))}</div>`
        } else {
          yield html`<pre>${content}</pre>`
        }
      }
      return html`
        ${asyncReplace(loadFile())}
      `
    } else {
      let filename = pathname.split('/').slice(-1)[0]
      return html`<a href=${pathname} download=${filename} title=${`Download ${filename}`}>${pathname}</a>`
    }
  }

}

customElements.define('beaker-file-view', FileView)