/* globals DatArchive */

import * as yo from 'yo-yo'
import {BaseSidebar} from './base'
import * as pages from '../../pages'
import * as toast from '../toast'

// exported api
// =

export class UserSidebar extends BaseSidebar {
  static shouldRender (page) {
    return page.siteInfo && page.siteInfo.type.includes('unwalled.garden/user')
  }

  constructor (page) {
    super(page)
    this.info = null
    this.url = null
    this.currentUserSession = null
    this.isCurrentUser = false
    this.load()
  }

  render () {
    if (!this.info) return ''
    return yo`
      <div class="user-sidebar">
        <div class="card">
          <img src="${this.url.origin}/thumb.jpg">
          <div class="title">${this.info.title}</div>
          <div class="description">${this.info.description}</div>
          ${this.isCurrentUser
            ? yo`<div class="isyou sepbottom"><span>This is you!</span></div>`
            : this.renderFollowers()}
          ${this.isCurrentUser
            ? ''
            : yo`
              <div class="sepbottom">
                ${this.isCurrentUserFollowing
                  ? yo`<div class="btn" onclick=${() => this.unfollow()}><span class="fa fa-minus"></span> Unfollow</div>`
                  : yo`<div class="btn" onclick=${() => this.follow()}><span class="fa fa-plus"></span> Follow</div>`}
              </div>`}
          <div>
            <div><a class="link" onclick=${() => this.open('feed')}>View Feed</a></div>
          </div>
        </div>
      </div>`
  }

  renderFollowers () {
    if (true/* todo followers.length === 0 */) {
      return yo`<div class="followers sepbottom"><span class="nobody"><span class="fa fa-user"></span> Not followed by anybody you follow</span></div>`
    }
    return yo`<div class="followers sepbottom"><span class="fa fa-user"></span>Followed by <a class="link">Tara Vancil</a></div>`
  }

  async load () {
    var dat = new DatArchive(this.page.url)
    this.url = new URL(this.page.url)
    this.currentUserSession = await beaker.browser.getUserSession()
    this.isCurrentUser = this.url.origin === this.currentUserSession.url
    this.info = JSON.parse(await dat.readFile('/dat.json'))
    this.isCurrentUserFollowing = !this.isCurrentUser && await beaker.followgraph.isAFollowingB(this.currentUserSession.url, this.url.origin)
    this.rerender()
  }

  async follow () {
    try {
      await beaker.followgraph.follow(this.url.origin)
      this.isCurrentUserFollowing = true
    } catch (e) {
      console.error('Failed to follow', e)
      toast.create('Failed to follow: ' + e.toString())
      return
    }
    this.rerender()
  }

  async unfollow () {
    try {
      await beaker.followgraph.unfollow(this.url.origin)
      this.isCurrentUserFollowing = false
    } catch (e) {
      console.error('Failed to unfollow', e)
      toast.create('Failed to unfollow: ' + e.toString())
      return
    }
    this.rerender()
  }

  open (view) {
    if (view === 'feed') {
      pages.getActive().loadURL('beaker://feed/#user/' + this.url.origin)
    }
  }
}
