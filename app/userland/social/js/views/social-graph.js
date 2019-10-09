import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { ifDefined } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/if-defined.js'
import { pluralize } from 'beaker://app-stdlib/js/strings.js'
import socialGraphViewCSS from '../../css/views/social-graph.css.js'

export class SocialGraphView extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      info: {type: Object},
      currentSubview: {type: String},
      items: {type: Array}
    }
  }

  static get styles () {
    return socialGraphViewCSS
  }

  constructor () {
    super()
    this.user = undefined
    this.info = undefined
    this.currentSubview = 'followers'
    this.items = []
    this.load()
  }

  async load () {
    if (!this.user) return

    // fetch listing
    var items
    var urlsOfUsersFollowedByLocal = (await uwg.follows.list({author: this.user.url})).map(({topic}) => topic.url)
    var urlsOfMyNetwork = [this.user.url].concat(urlsOfUsersFollowedByLocal)
    if (this.currentSubview === 'followers') {
      items = (await uwg.follows.list({topic: this.info.key, author: urlsOfMyNetwork})).map(({author}) => author)
    } else {
      items = (await uwg.follows.list({author: this.info.key})).map(({topic}) => topic)
    }
    await Promise.all(items.map(async (item) => {
      item.followers = (await uwg.follows.list({topic: item.url, author: urlsOfMyNetwork})).map(({author}) => author)
      item.isLocalUser = this.user.url === item.url
      item.isLocalUserFollowing = !!item.followers.find(f => f.url === this.user.url)
    }))

    // sort by followers
    items.sort((a, b) => b.followers.length - a.followers.length)

    this.items = items
    console.log('loaded', this.items)
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <nav>
        <a class=${this.currentSubview === 'followers' ? 'current' : undefined} @click=${e => this.onClickNav(e, 'followers')}>Followers</a>
        <a class=${this.currentSubview === 'following' ? 'current' : undefined} @click=${e => this.onClickNav(e, 'following')}>Following</a>
      </nav>
      ${!this.items.length
        ? html`
          <div class="empty">
            ${this.info && this.info.title || 'Anonymous'} is
            ${this.currentSubview === 'followers'
              ? 'not followed by anyone in your network.'
              : 'not following anyone.'}
          </div>`
        : ''}
      <div class="listing">
        ${repeat(this.items, item => this.renderItem(item))}
      </div>
    `
  }

  renderItem (item) {
    const numFollowers = item.followers.length
    const followerNames = item.followers.length ? item.followers.map(f => f.title || 'Anonymous').join(', ') : undefined
    return html`
      <div class="item">
        <a class="thumb" href=${item.url}>
          <img src="asset:thumb:${item.url}?cache_buster=${Date.now()}">
        </a>
        <div class="details">
          <div class="title">
            <a href=${item.url}>${item.title}</a>
            ${!item.isLocalUser ? html`
              <button @click=${e => this.onToggleFollow(e, item)}>
                <span class="fas fa-fw fa-${item.isLocalUserFollowing ? 'check' : 'rss'}"></span>
                ${item.isLocalUserFollowing ? 'Following' : 'Follow'}
              </button>
            ` : ''}
          </div>
          <div class="description">
            ${item.isLocalUser
                ? html`<span class="label">This is me</span>`
                : item.isOwner ? html`<span class="label">My user</span>` : ''}
            ${item.description}
          </div>
          <div class="bottom-line">
            <span class="followers">
              <span class="far fa-fw fa-user"></span>
              Followed by
              <a data-tooltip=${ifDefined(followerNames)}>${numFollowers} ${pluralize(numFollowers, 'user')} in my network</a>
            </span>
          </div>
        </div>
      </div>
    `
  }

  // events
  // =

  onClickNav (e, subview) {
    this.currentSubview = subview
    this.load()
  }

  async onToggleFollow (e, item) {
    if (item.isLocalUserFollowing) {
      await uwg.follows.remove(item.url)
    } else {
      await uwg.follows.add(item.url)
    }
    this.load()
  }
}

customElements.define('social-graph-view', SocialGraphView)