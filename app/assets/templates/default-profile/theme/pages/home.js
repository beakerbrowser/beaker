import { LitElement, html } from '../vendor/lit-element.js'
import { Feed } from '../lib/feed.js'

import '../com/feed.js'

class Homepage extends LitElement {
  static get properties () {
    return {
      siteInfo: Object,
      posts: Array,
      followedUsers: Array
    }
  }

  constructor() {
    super()
    this.posts = []
    this.followedUsers = []
    this.load()
  }

  createRenderRoot() {
    return this // dont use the shadow dom
  }

  async load () {
    this.posts = await Feed.list({reverse: true})
  }

  render() {
    return html`
      <x-feed .siteInfo=${this.siteInfo} .posts=${this.posts}></x-feed>
    `
  }
}

customElements.define('x-homepage', Homepage)
