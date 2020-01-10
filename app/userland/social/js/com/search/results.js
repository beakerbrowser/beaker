import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import { repeat } from '../../../vendor/lit-element/lit-html/directives/repeat.js'
import * as uwg from '../../lib/uwg.js'
import resultsCSS from '../../../css/com/search/results.css.js'
import '../posts/post.js'
import '../paginator.js'

const QUERY_PAGE_SIZE = 100
const PAGE_SIZE = 25

export class SearchResults extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      driveType: {type: String, attribute: 'drive-type'},
      query: {type: String},
      results: {type: Array}
    }
  }

  static get styles () {
    return resultsCSS
  }

  constructor () {
    super()
    this.user = undefined
    this.driveType = undefined
    this.query = undefined
    this.results = undefined
    this.page = 0
  }

  async load () {
    var results = await this.runQuery()
    /* dont await */ this.loadFeedAnnotations(results)
    this.results = results
    console.log(this.results)
  }

  async runQuery () {
    var sliceStart = this.page * PAGE_SIZE
    var sliceEnd = sliceStart + PAGE_SIZE
    var results = []
    var offset = 0
    var query = this.query ? this.query.toLowerCase() : undefined
    while (1) {
      let candidates = await uwg.posts.list({
        driveType: this.driveType || undefined,
        offset,
        limit: QUERY_PAGE_SIZE,
        sort: 'name',
        reverse: true
      })
      if (candidates.length === 0) {
        break
      }
      if (query) {
        candidates = candidates.filter(candidate => (
          candidate.stat.metadata.title.toLowerCase().includes(query)
        ))
      }
      results = results.concat(candidates)
      if (results.length >= sliceEnd) break
      offset += QUERY_PAGE_SIZE
    }
    results = results.slice(sliceStart, sliceEnd)
    await uwg.profiles.readAllProfiles(results)
    return results
  }

  requestFeedPostsUpdate () {
    Array.from(this.shadowRoot.querySelectorAll('beaker-post'), el => el.requestUpdate())
  }

  async refreshFeed () {
    this.loadFeedAnnotations(this.results)
  }

  async loadFeedAnnotations (results) {
    for (let post of results) {
      ;[post.votes, post.numComments] = await Promise.all([
        uwg.votes.tabulate(post.url),
        uwg.comments.count({href: post.url})
      ])
      this.requestFeedPostsUpdate()
    }
  }

  render () {
    return html`
      <link rel="stylesheet" href="/webfonts/fontawesome.css">
      <div class="feed">
        ${typeof this.results === 'undefined' ? html`
          <div class="empty">
            <span class="spinner"></span>
          </div>
        ` : html`
          ${repeat(this.results, post => html`
            <beaker-post
              .post=${post}
              user-url="${this.user.url}"
            ></beaker-post>
          `)}
          ${this.results.length === 0
            ? html`
              <div class="empty">
                <div><span class="fas fa-search"></span></div>
                <div>
                  No results found.
                </div>
              </div>
            ` : ''}
          <beaker-paginator
            page=${this.page}
            label="Showing results ${(this.page * PAGE_SIZE) + 1} - ${(this.page + 1) * PAGE_SIZE}"
            @change-page=${this.onChangePage}
          ></beaker-paginator>
        `}
      </div>
    `
  }

  // events
  // =

  onChangePage (e) {
    this.page = e.detail.page
    this.results = undefined
    this.load()
  }
}

customElements.define('beaker-search-results', SearchResults)
