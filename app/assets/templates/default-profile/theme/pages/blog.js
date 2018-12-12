import { LitElement, html } from '../vendor/lit-element.js'

class Blog extends LitElement {
  static get properties () {
    return {
      siteInfo: Object
    }
  }

  constructor() {
    super()
    this.posts = []
    this.load()
  }

  createRenderRoot() {
    return this // dont use the shadow dom
  }

  async load () {
    var site = new DatArchive(window.location)
    this.posts = JSON.parse(await site.readFile('/data/blog.json'))
    this.requestUpdate()
  }

  render() {
    return html`
      <style>
        .post {
          margin-bottom: 1rem;
        }
      </style>
      ${this.posts.map(post => html`
        <article class="post">
          <h4 class="title is-6"><a href="#">${post.title}</a></h4>
          <h6 class="subtitle is-6">${post.date}</h6>
        </article>
      `)}
    `
  }
}

customElements.define('x-blog', Blog)
