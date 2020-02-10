import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import { repeat } from '../../../vendor/lit-element/lit-html/directives/repeat.js'
import * as uwg from '../../lib/uwg.js'
import { timeDifference } from '../../lib/time.js'
import { toNiceUrl, pluralize } from '../../lib/strings.js'
import resultsCSS from '../../../css/com/search/results.css.js'
import '../posts/post.js'
import '../profiles/list.js'
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
    var results = []
    if (!this.driveType || this.driveType === 'user') {
      results = results.concat(await this.runUsersQuery())
    }
    if (results.length < PAGE_SIZE) {
      results = results.concat(await this.runPostsQuery(results.length))
    }
    /* dont await */ this.loadResultAnnotations(results)
    this.results = results
    console.log(this.query, this.driveType, this.results)

    await this.requestUpdate()
    Array.from(this.shadowRoot.querySelectorAll('[loadable]'), el => el.load())
  }

  async runPostsQuery (numExistingResults = 0) {
    var sliceStart = this.page * PAGE_SIZE
    var sliceEnd = sliceStart + PAGE_SIZE - numExistingResults
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
      }, {
        includeContent: false,
        includeProfiles: false
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
    return results.map(fromPostToResult)
  }

  async runUsersQuery (numExistingResults = 0) {
    var sliceStart = this.page * PAGE_SIZE
    var sliceEnd = sliceStart + PAGE_SIZE - numExistingResults
    var query = this.query ? this.query.toLowerCase() : undefined
    let results = await uwg.users.list(undefined, {includeProfiles: true})
    if (query) {
      results = results.filter(candidate => (
        candidate.username.toLowerCase().includes(query)
        || candidate.title.toLowerCase().includes(query)
        || candidate.description.toLowerCase().includes(query)
      ))
    }
    results = results.slice(sliceStart, sliceEnd)
    return results.map(fromProfileToResult)
  }

  async loadResultAnnotations (results) {
    for (let result of results) {
      if (result.type === 'post') {
        ;[result.postMeta.votes, result.postMeta.numComments] = await Promise.all([
          uwg.votes.tabulate(result.url, undefined, {includeProfiles: true}),
          uwg.comments.count({href: result.url})
        ])
      } else if (result.type === 'user') {
      }
      this.requestUpdate()
    }
  }

  render () {
    var hasMore = this.results && this.results.length >= PAGE_SIZE
    var queryRe = new RegExp(`(${this.query})`, 'gi')
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      <div class="feed">
        ${typeof this.results === 'undefined' ? html`
          <div class="empty">
            <span class="spinner"></span>
          </div>
        ` : html`
          ${repeat(this.results, result => {
            if (result.type === 'post') {
              let viewProfileUrl = `/${result.postMeta.author.username}`
              let numComments = result.postMeta.numComments || 0
              let votes = result.postMeta.votes
              return html`
                <div class="result">
                  <h4>
                    <a class="title" href=${result.url}>${facetize(result.title, queryRe, this.query)}</a>
                    <small><a href=${result.url}>${toNiceUrl(result.url)}</a></small>
                  </h4>
                  <div class="details">
                    by <a class="author" href=${viewProfileUrl} title=${result.postMeta.author.title}>${result.postMeta.author.title}</a>
                    | posted <a href=${result.viewUrl}>${timeDifference(result.postMeta.ctime, true, 'ago')}</a>
                    | <a class="comments" href=${result.viewUrl}>
                      ${numComments} ${pluralize(numComments, 'comment')}
                    </a>
                  </div>
                  ${votes && (votes.upvotes.length || votes.downvotes.length) ? html`
                    <div class="voters">
                      ${votes.upvotes.length ? html`<span>Upvoted by ${this.renderUsersList(votes.upvotes)}</span>` : ''}
                      ${votes.downvotes.length ? html`<span>Downvoted by ${this.renderUsersList(votes.downvotes)}</span>` : ''}
                    </div>
                  ` : ''}
                </div>
              `
            }
            if (result.type === 'user') {
              return html`
                <div class="result">
                  <h4>
                    <a class="title" href=${result.viewUrl}>${facetize(result.title, queryRe, this.query)}</a>
                    <small><a href=${result.viewUrl}>${result.userMeta.username}</a></small>
                  </h4>
                  <div class="description">${facetize(result.userMeta.description, queryRe, this.query)}</div>
                </div>
              `
            }
          })}
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
            label="Showing results ${(this.page * PAGE_SIZE) + 1} - ${(this.page * PAGE_SIZE) + (hasMore ? PAGE_SIZE : this.results.length)}"
            @change-page=${this.onChangePage}
            ?at-end=${!hasMore}
          ></beaker-paginator>
        `}
      </div>
    `
  }

  renderUsersList (users) {
    var els = []
    for (let i = 0; i < users.length; i++) {
      let profile = users[i]
      let comma = (i !== users.length - 1) ? ', ' : ''
      els.push(html`
        <a href=${'/' + profile.username} title=${profile.title}>${profile.title}</a>${comma}
      `)
    }
    return els
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

function fromPostToResult (post) {
  var metadata = post.stat.metadata
  return {
    type: 'post',
    viewUrl: `/${post.url.slice('hyper://'.length)}`,
    url: metadata.href || post.url,
    title: metadata.title,
    postMeta: {
      ctime: post.stat.ctime, // TODO replace with rtime
      'drive-type': metadata['drive-type'],
      author: post.drive,
      votes: undefined,
      numComments: undefined
    }
  }
}

function fromProfileToResult (profile) {
  return {
    type: 'user',
    viewUrl: `/${profile.username}`,
    url: profile.url,
    title: profile.title,
    userMeta: {
      username: profile.username,
      description: profile.description
    }
  }
}

function facetize (str, queryRe, query) {
  let parts = str.split(queryRe)
  return parts.map(part => part.toLowerCase() === query ? html`<strong>${part}</strong>` : part)
}