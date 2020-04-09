import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { unsafeHTML } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import { hashFnv32a } from 'beaker://app-stdlib/js/strings.js'
import MarkdownIt from 'beaker://app-stdlib/vendor/markdown-it.js'
import * as addressBook from '../lib/address-book.js'
import feedCSS from '../../css/views/feed.css.js'

/**
 * Caching in the feed is designed to only query the network every 30 minutes
 * Because a hidden start page is always active, this query will occur regularly (even if the user doesnt perceive the page as "open")
 * 
 * The FEED_UPDATE_INTERVAL determines how long the cache is still valid
 * The FEED_CHECK_INTERVAL determines when the check occurs
 * If the browser is opening for the first time in a while, FEED_CHECK_INTERVAL will establish when the first query occurs
 * Afterward, FEED_UPDATE_INTERVAL will establish when subsequent queries occur
 * 
 * The user is expected to manually trigger updates if they want fresher updates
 */

const FEED_UPDATE_INTERVAL = 30 * 60e3 // every 30 minutes
const FEED_CHECK_INTERVAL = 10 * 60e3 // every 10 minutes

var md = new MarkdownIt({html: false, breaks: true})

function needsQuery (sourceHash) {
  if (!('cachedFeed' in localStorage)) {
    return true
  }

  if (localStorage.feedSourceHash !== String(sourceHash)) {
    return true // sources changed
  }
}

export class FeedView extends LitElement {
  static get properties () {
    return {
      posts: {type: Array},
      filter: {type: String}
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

    setInterval(this.checkFeedForUpdates.bind(this), FEED_CHECK_INTERVAL)
  }

  async load () {
    await this.loadFeedPossiblyCached()
  }

  async forceLoad () {
    let contacts = await this.getContacts()
    this.loadFeed(contacts)
  }

  async getContacts () {
    var contacts = await beaker.contacts.list()
    if (!this.profile) {
      this.profile = await addressBook.loadProfile()
    }
    if (!contacts.find(c => c.url === this.profile.url)) {
      contacts.push(this.profile)
    }
    return contacts
  }

  async checkFeedForUpdates () {
    console.debug('Checking feed for updates')

    var lastFeedUpdate = localStorage.lastFeedUpdate || 0
    if (Date.now() - lastFeedUpdate < FEED_UPDATE_INTERVAL) {
      this.loadFeedPossiblyCached()
    } else {
      localStorage.lastFeedUpdate = Date.now() // set immediately to avoid colliding with other active tabs
      let contacts = await this.getContacts()
      this.loadFeed(contacts)
    }
  }

  async loadFeedPossiblyCached () {
    // do a full load if sources havent changed
    // otherwise pull latest from the cache

    var contacts = await this.getContacts()
    var sourceHash = hashFnv32a(JSON.stringify(contacts.map(c => c.url)))
    if (!needsQuery(sourceHash)) {
      console.debug('Using cached feed')
      this.posts = JSON.parse(localStorage.cachedFeed)
      return // use cache
    }
    localStorage.feedSourceHash = sourceHash
    this.loadFeed(contacts) // run query
  }

  async loadFeed (contacts) {
    console.debug('Running feed query')
    var files = await beaker.hyperdrive.query({
      path: '/microblog/*',
      drive: contacts.map(c => c.url),
      sort: 'ctime',
      reverse: true,
      limit: 30
    })

    if (this.posts && this.posts[0] && this.posts[0].url === files[0].url) {
      // no new posts
      return
    }

    this.posts = []
    for (let file of files) {
      let filename = file.path.split('/').pop()
      let content
      try {
        // REWORK THIS
        if (/\.(png|jpe?g|gif|svg)$/i.test(file.path)) {
          content = {img: file.url}
        } else if (/\.(mp4|webm|mov)/i.test(file.path)) {
          content = {video: file.url}
        } else if (/\.(mp3|ogg)/i.test(file.path)) {
          content = {audio: file.url}
        } else {
          let txt = await beaker.hyperdrive.readFile(file.url)
          // render content
          if (/\.md$/i.test(file.path)) {
            txt = md.render(txt)
            content = {html: txt}
          } else {
            content = {txt}
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
        ctime: file.stat.ctime,
        content
      })
      this.requestUpdate()
    }
    localStorage.cachedFeed = JSON.stringify(this.posts)
    localStorage.lastFeedUpdate = Date.now()
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
    let day = niceDate(post.ctime)
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
        <div class="content">
          ${post.content.img ? html`<img src=${post.content.img}>` : ''}
          ${post.content.video ? html`<video controls src=${post.content.video}></video>` : ''}
          ${post.content.audio ? html`<audio controls src=${post.content.audio}></audio>` : ''}
          ${post.content.html ? html`${unsafeHTML(post.content.html)}` : ''}
          ${post.content.txt ? html`<pre>${post.content.txt}</pre>` : ''}
        </div>
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