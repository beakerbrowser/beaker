import { LitElement, html } from '../vendor/lit-element.js'

class Feed extends LitElement {
  static get properties() {
    return {siteInfo: Object, posts: Array}
  }

  createRenderRoot() {
    return this // dont use the shadow dom
  }

  render() {
    return html`
      <style>
        x-feed-item {
          display: block;
          box-sizing: border-box;
          max-width: 800px;
          padding: 2rem 2.5rem 2rem 1rem;
          border-bottom: 1px solid #eaeaea;
        }
        x-feed-item:first-child {
          padding-top: 0;
        }
      </style>
      <div class="posts">
        ${this.posts.map(post => html`
          <x-feed-item
            url=${post.url}
            displayName=${this.siteInfo.title}
            thumbUrl=${this.siteInfo.thumbUrl}
            domain=${this.siteInfo.domain}
            filename=${post.filename}
            content=${post.content}
            createdAt=${post.createdAt}
          ></x-feed-item>
        `)}
      </div>
    `
  }
}

class FeedItem extends LitElement {
  static get properties () {
    return {
      url: String,
      displayName: String,
      thumbUrl: String,
      domain: String,
      filename: String,
      content: String,
      createdAt: String
    }
  }

  createRenderRoot() {
    return this // dont use the shadow dom
  }

  render () {
    return html`
      <article class="media">
        <figure class="media-left">
          <p class="image is-64x64">
            <img class="is-rounded" src=${this.thumbUrl} style="width: 64px">
          </p>
        </figure>
        <div class="media-content">
          <div class="content">
            <p>
              <a class="has-text-grey-dark" href="dat://${this.domain}">
                <strong>${this.displayName}</strong>
              </a>
              <a class="has-text-grey" href="dat://${this.domain}">
                <small>@${shortenDomain(this.domain)}</small>
              </a>
              &middot;
              <a class="has-text-grey" href=${this.url}><small>${(new Date(this.createdAt)).toLocaleString()}</small></a>
              <br>
              ${this.content}
            </p>
          </div>
        </div>
      </article>
    `
  }
}

var hashRegex = /[0-9a-f]{64}/i
function shortenDomain (str) {
  if (!str) return str
  if (hashRegex.test(str)) {
    return str.slice(0, 6) + '..' + str.slice(62, 64)
  }
  return str
}

customElements.define('x-feed', Feed)
customElements.define('x-feed-item', FeedItem)
