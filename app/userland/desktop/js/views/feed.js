import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { unsafeHTML } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import MarkdownIt from 'beaker://app-stdlib/vendor/markdown-it.js'
import feedCSS from '../../css/views/feed.css.js'

let md = new MarkdownIt({html: false, breaks: true})

export class FeedView extends LitElement {
  static get properties () {
    return {
      posts: {type: Array},
      filter: {type: String},
      profile: {type: Object}
    }
  }

  static get styles () {
    return feedCSS
  }

  constructor () {
    super()
    this.posts = undefined
    this.filter = undefined
    this.profile = undefined
  }

  async load () {
    var contacts = await beaker.contacts.list()
    if (this.profile && !contacts.find(c => c.url === this.profile.url)) {
      contacts.push(this.profile)
    }
    var files = await beaker.hyperdrive.query({
      path: '/microblog/*',
      drive: contacts.map(c => c.url),
      sort: 'ctime',
      reverse: true,
      limit: 30
    })

    this.posts = []
    for (let file of files) {
      let filename = file.path.split('/').pop()
      let content
      try {
        if (/\.(png|jpe?g|gif|svg)$/i.test(file.path)) {
          content = html`<img src=${file.url}>`
        } else if (/\.(mp4|webm|mov)/i.test(file.path)) {
          content = html`<video controls><source src=${file.url}></source></video>`
        } else if (/\.(mp3|ogg)/i.test(file.path)) {
          content = html`<audio controls><source src=${file.url}></source></audio>`
        } else {
          let txt = await beaker.hyperdrive.readFile(file.url)
          // render content
          if (/\.md$/i.test(file.path)) {
            txt = md.render(txt)
            content = html`${unsafeHTML(txt)}`
          } else {
            content = html`<pre>${txt}</pre>`
          }
        }
      } catch (e) {
        console.error('Failed to read', file.path)
        console.error(e)
        continue
      }

      this.posts.push({
        author: contacts.find(c => c.url === file.drive),
        url: file.url,
        filename,
        stat: file.stat,
        content
      })
      this.requestUpdate()
    }
  }

  // rendering
  // =

  render () {
    var posts = this.posts
    if (posts && this.filter) {
      // TODO
      // posts = posts.filter(drive => drive.info.title.toLowerCase().includes(this.filter))
    }
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${posts ? html`
        <div class="posts">
          ${repeat(posts, post => this.renderPost(post))}
          ${posts.length === 0 ? html`
            <div class="empty"><span class="fas fa-rss"></span><div>Your feed is empty! Add contacts to your address book to build your feed.</div></div>
          ` : ''}
          ${posts.length === 0 && this.filter ? html`
            <div class="empty"><div>No matches found for "${this.filter}".</div></div>
          ` : ''}
        </div>
      ` : html`
        <div class="loading"><span class="spinner"></span></div>
      `}
    `
  }

  renderPost (post) {
    let day = niceDate(post.stat.ctime)
    return html`
      <div class="post">
        <a class="thumb" href=${post.author.url}>
          <img src="asset:thumb-50:${post.author.url}">
        </a>
        <div class="meta">
          <strong><a href=${post.author.url} title=${post.author.title}>${post.author.title || 'Anonymous'}</a></strong>
          <a href=${post.url} title=${post.filename}>${post.filename}</a>
          <small>${day}</small>
        </div>
        <div class="content">${post.content}</div>
      </div>
    `
  }

  // events
  // =


}

customElements.define('feed-view', FeedView)

var today = (new Date()).toLocaleDateString()
var yesterday = (new Date(Date.now() - 8.64e7)).toLocaleDateString()
function niceDate (ts) {
  var date = (new Date(ts)).toLocaleDateString()
  if (date === today) return 'Today'
  if (date === yesterday) return 'Yesterday'
  return date
}