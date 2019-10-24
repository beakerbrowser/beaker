import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { ifDefined } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/if-defined.js'
import peopleViewCSS from '../../css/views/people.css.js'
import * as QP from '../lib/query-params.js'
import { oneof } from '../lib/validation.js'
import _uniqBy from 'lodash.uniqby'
import '../hover-menu.js'

const SUBVIEW_OPTIONS = {
  following: 'Following',
  foafs: 'Extended Network'
}

const SORT_OPTIONS = {
  followers: 'Most followed',
  title: 'Alphabetical'
}

class PeopleView extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      items: {type: Array},
      currentView: {type: String},
      currentSubview: {type: String},
      currentSort: {type: String}
    }
  }

  static get styles () {
    return peopleViewCSS
  }

  constructor () {
    super()
    this.currentSubview = oneof(QP.getParam('subview'), 'following', ['following', 'foafs'])
    this.currentSort = oneof(QP.getParam('sort'), 'title', ['followers', 'title'])
    this.items = []
  }

  async load () {
    // fetch listing
    var items
    var libraryUsers = (await beaker.users.list())
      .map(u => { u.isOwner = true; return u })
      // TODO .concat(await uwg.library.list({type: 'unwalled.garden/person'}))
    var followedUsers = [] // TODO (await uwg.follows.list({author: this.user.url})).map(({topic}) => topic)
    var networkAuthors = [this.user.url].concat(followedUsers.map(f => f.url))
    if (this.currentSubview === 'foafs') {
      let foafUsers = []// TODO (await uwg.follows.list({author: networkAuthors})).map(({topic}) => topic)
      items = foafUsers.filter(u => (
        !libraryUsers.find(u2 => u2.url === u.url)
        && !followedUsers.find(u2 => u2.url === u.url)
      ))
    } else if (this.currentSubview === 'following') {
      items = followedUsers.concat(libraryUsers)
    }
    items = _uniqBy(items, 'url')
    await Promise.all(items.map(async (item) => {
      item.followers = [] // TODO (await uwg.follows.list({topic: item.url, author: networkAuthors})).map(({author}) => author)
      item.isLocalUser = this.user.url === item.url
      item.isLocalUserFollowing = !!item.followers.find(f => f.url === this.user.url)
    }))

    // apply sort
    if (this.currentSort === 'followers') {
      items.sort((a, b) => b.followers.length - a.followers.length)
    } else {
      items.sort((a, b) => (a.title||'Anonymous').localeCompare(b.title||'Anonymous'))
    }

    this.items = items
    console.log('loaded', this.items)
  }

  // rendering
  // =

  render () {
    document.title = 'People'
    let items = this.items

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="header">
        <hover-menu
          icon="fas fa-filter"
          .options=${SUBVIEW_OPTIONS}
          current=${SUBVIEW_OPTIONS[this.currentSubview]}
          @change=${this.onChangeSubview}
        ></hover-menu>
        <hr>
        <hover-menu
          right
          icon="fas fa-sort-amount-down"
          .options=${SORT_OPTIONS}
          current=${SORT_OPTIONS[this.currentSort]}
          @change=${this.onChangeSort}
        ></hover-menu>
        <div class="spacer"></div>
      </div>
      ${!items.length
        ? html`<div class="empty"><div><span class="far fa-sad-tear"></span></div>No people found.</div>`
        : ''}
      <div class="listing">
        ${repeat(items, item => this.renderItem(item))}
      </div>
    `
  }

  renderItem (item) {
    const numFollowers = item.followers.length
    const followerNames = item.followers.length ? item.followers.map(f => f.title || 'Anonymous').join(', ') : undefined
    return html`
      <a class="item" href=${item.url}>
        <div class="thumb">
          <img src="asset:thumb:${item.url}?cache_buster=${Date.now()}">
        </div>
        <div class="details">
          <div class="title">${item.title}</div>
          <div class="bottom-line">
            <span class="followers" data-tooltip=${ifDefined(followerNames)}>
              <span class="far fa-fw fa-user"></span>
              ${numFollowers}
            </span>

            ${item.isLocalUser
              ? html`<span class="label">This is me</span>`
              : item.isOwner
                ? html`<span class="label">My user</span>`
                : html`
                  <button @click=${e => this.onToggleFollow(e, item)}>
                    <span class="fas fa-fw fa-${item.isLocalUserFollowing ? 'check' : 'rss'}"></span>
                    ${item.isLocalUserFollowing ? 'Following' : 'Follow'}
                  </button>
                `}
          </div>
        </div>
      </div>
    `
  }

  // events
  // =

  onChangeSubview (e) {
    this.currentSubview = e.detail.id
    QP.setParams({subview: this.currentSubview})
    this.load()
  }

  onChangeSort (e) {
    this.currentSort = e.detail.id
    QP.setParams({sort: this.currentSort})
    this.load()
  }

  async onToggleFollow (e, item) {
    e.preventDefault()
    if (item.isLocalUserFollowing) {
      // TODO await uwg.follows.remove(item.url)
    } else {
      // TODO await uwg.follows.add(item.url)
    }
    this.load()
  }
}
customElements.define('people-view', PeopleView)