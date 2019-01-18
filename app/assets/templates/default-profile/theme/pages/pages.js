import { LitElement, html } from '../vendor/lit-element.js'
import { Pages as LibPages } from '../lib/pages.js'

class Pages extends LitElement {
  static get properties () {
    return {
      siteInfo: Object
    }
  }

  constructor() {
    super()
    this.pages = []
    this.load()
  }

  createRenderRoot() {
    return this // dont use the shadow dom
  }

  async load () {
    this.pages = await LibPages.list({reverse: true})
    this.requestUpdate()
  }

  render() {
    var pages = this.pages
    if (this.siteInfo && this.siteInfo.isOwner) {
      pages = pages.concat([{
        type: 'new',
        url: '/pages/_new',
        title: '+ New page',
        description: 'Create a new Markdown or HTML page'
      }])
    }
    return html`
      <style>
        article {
          margin-bottom: 1rem;
          padding: 0 1rem;
        }
        article.new {
          color: gray;
        }
        article.new * {
          color: inherit !important;
        }
        article.new a:hover {
          color: #333 !important;
        }
      </style>
      ${pages.filter(Boolean).map(page => html`
        <article class="post ${page.type}">
          <h4 class="title is-5"><a href="${removeExt(page.url)}">${page.title}</a></h4>
          <h6 class="subtitle is-6">${toDate(page.createdAt)}</h6>
        </article>
      `)}
    `
  }
}

customElements.define('x-pages', Pages)

function toDate (d) {
  if (!d) return ''
  d = new Date(d)
  var mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${mo[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function removeExt (url) {
  if (typeof url === 'string' && url.endsWith('.json')) {
    return url.slice(0, -5)
  }
  return url
}
