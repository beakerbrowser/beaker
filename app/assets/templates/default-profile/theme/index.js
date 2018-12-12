import { LitElement, html } from './vendor/lit-element.js'
import { SiteInfo } from './lib/site-info.js'

import './com/nav.js'
import './com/avatar.js'
import './com/hero.js'

import './pages/home.js'
import './pages/blog.js'
import './pages/pages.js'
import './pages/pages-new.js'
import './pages/pages-view.js'
import './pages/404.js'

const PAGES = [
  {href: '/', label: 'Feed', render: (theme) => html`<x-homepage .siteInfo=${theme.siteInfo}></x-homepage>`},
  // {href: '/blog', label: 'Blog', render: (theme) => html`<x-blog .siteInfo=${theme.siteInfo}></x-blog>`},
  {href: '/pages', label: 'Pages', render: (theme) => html`<x-pages .siteInfo=${theme.siteInfo}></x-pages>`},
  {href: '/pages/_new', label: false, render: (theme) => html`<x-new-page .siteInfo=${theme.siteInfo}></x-new-page>`},
  {href: /\/pages\/(.*)/i, label: false, render: (theme, m) => html`<x-view-page .siteInfo=${theme.siteInfo} .filename=${m[1]}></x-pages>`},
]

class Theme extends LitElement {
  static get properties () {
    return {
      siteInfo: Object
    }
  }

  constructor () {
    super()
    this.siteInfo = {}
    this.load()
  }

  createRenderRoot() {
    return this // dont use the shadow dom
  }

  async load () {
    this.siteInfo = await SiteInfo.fetch()
    console.log(this.siteInfo)
  }

  render() {
    return html`
      <style>
        .theme-container {
          padding: 0 20px;
          max-width: 800px;
        }
        x-nav {
          display: block;
          margin-bottom: 1.5rem;
        }
      </style>
      <div class="theme-container">
        <x-nav .items=${PAGES}></x-nav>
        ${this.page}
      </div>
    `
  }

  get page () {
    var regexData
    var page = PAGES.find(p => {
      if (typeof p.href === 'string') {
        return p.href === window.location.pathname
      }
      var match = p.href.exec(window.location.pathname)
      if (!match) return false
      regexData = match
      return true
    })
    if (!page) {
      return html`<x-404></x-404>`
    }
    return page.render(this, regexData)
  }
}

customElements.define('x-theme', Theme)
