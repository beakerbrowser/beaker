/* globals DatArchive beaker */

import * as yo from 'yo-yo'
import {BaseSiteInfo} from './base'
import * as pages from '../../../pages'
import * as toast from '../../toast'

// exported api
// =

export class UserSiteInfo extends BaseSiteInfo {
  static shouldRender (page) {
    return page.siteInfo && page.siteInfo.type.includes('unwalled.garden/user')
  }

  constructor (page) {
    super(page)
    this.info = null
    this.currentUserSession = null
    this.isCurrentUser = false
    this.followers = []
    this.didThumbLoadFail = false
    this.load()
  }

  reload () {
    this.load()
  }

  render () {
    if (!this.info) return ''
    return yo`
      <div class="site-info-details user-site-info">
        ${this.didThumbLoadFail ? '' : yo`<img src="${this.url.origin}/thumb.jpg?cache_buster=${Date.now()}" onerror=${() => this.onThumbError()}>`}
        <div class="title">${this.info.title}</div>
        <div class="description">${this.info.description}</div>
        ${this.renderTrustInfo()}
        ${this.renderFollowers()}
        ${this.followsUser ? yo`<div><div class="follows-you">Follows you</div></div>` : ''}
        ${this.isCurrentUser
          ? yo`
            <div class="septop">
              <div class="btn" onclick=${() => this.editProfile()}><span class="fa fa-pencil-square-o"></span> Edit profile</div>
            </div>`
          : yo`
            <div class="septop">
              ${this.isCurrentUserFollowing
                ? yo`<div class="btn" onclick=${() => this.unfollow()}><span class="fa fa-minus"></span> Unfollow</div>`
                : yo`<div class="btn" onclick=${() => this.follow()}><span class="fa fa-plus"></span> Follow</div>`}
            </div>`}
        ${''/* TODO<div>
          <div><a class="link" onclick=${() => this.open('feed')}>View Feed</a></div>
        </div>*/}
      </div>`
  }

  renderTrustInfo () {
    if (this.isCurrentUser) {
      return yo`<div class="trust-info"><span class="label trusted">This is you!</span></div>`
    }
    if (this.info.isOwner) {
      return yo`<div class="trust-info"><span class="label trusted">You created this site.</span></div>`      
    }
    var siteTrust = this.page.siteTrust
    if (siteTrust) {
      if (siteTrust.getRating() !== 'trusted') {
        return yo`<div class="trust-info"><span class="label not-trusted">The identity of this user can not be verified.</span></div>`
      }
      if (siteTrust.isTitleVerified) {
        return yo`<div class="trust-info"><span class="label trusted">This user${"'"}s identity has been verified.</span></div>`
      }
      if (siteTrust.isDomainVerified) {
        return yo`<div class="trust-info"><span class="label trusted">This domain has been verified.</span></div>`
      }
    }
  }

  renderFollowers () {
    if (this.isCurrentUser) {
      return ''
    }
    var nFollowers = this.followers.length
    if (nFollowers === 0) {
      return yo`<div class="followers"><span class="fa fa-user"></span>Not followed by anybody you follow.</div>`
    }
    var followers = this.followers.map((follower, i) => {
      var sep = ''
      if (nFollowers > 2) {
        if (i === nFollowers - 2) {
          sep = ', and '
        } else if (i < nFollowers - 2) {
          sep = ', '
        }
      } else if (nFollowers === 2 && i === 0) {
        sep = ' and '
      }
      if (follower.url === this.currentUserSession.url) return yo`<span>you${sep}</span>`
      return yo`<span><a onclick=${() => this.open(follower.url)}>${this.renderUserTitle(follower)}</a>${sep}</span>`
    })
    return yo`
      <div class="followers">
        <span class="fa fa-user"></span>Followed by ${followers}.
      </div>`
  }

  renderUserTitle (follower) {
    var title = follower.title
    if (!title) {
      var urlp = new URL(follower.url)
      title = urlp.hostname
      if (title.length === 64) {
        title = title.slice(0, 6) + '..' + title.slice(-2)
      }
    }
    return title
  }

  async load () {
    // first pass
    var dat = new DatArchive(this.page.url)
    this.currentUserSession = await beaker.browser.getUserSession()
    this.isCurrentUser = this.url.origin === this.currentUserSession.url
    this.info = await dat.getInfo()
    this.followers = await beaker.followgraph.listFollowers(this.url.origin, {includeDesc: true})
    this.followsUser = !this.isCurrentUser && await beaker.followgraph.isAFollowingB(this.url.origin, this.currentUserSession.url)
    this.isCurrentUserFollowing = !this.isCurrentUser && Boolean(this.followers.find(f => f.url === this.currentUserSession.url))
    this.rerender()
  }

  async follow () {
    try {
      await beaker.followgraph.follow(this.url.origin)
      this.isCurrentUserFollowing = true
      this.followers.push({url: this.currentUserSession.url})
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
      this.followers.splice(this.followers.findIndex(f => f.url === this.currentUserSession.url), 1)
    } catch (e) {
      console.error('Failed to unfollow', e)
      toast.create('Failed to unfollow: ' + e.toString())
      return
    }
    this.rerender()
  }

  async editProfile () {
    await beaker.browser.showEditProfileModal()
    this.info = JSON.parse(await (new DatArchive(this.url.toString())).readFile('/dat.json'))
    this.rerender()
  }

  open (view) {
    if (view === 'feed') {
      pages.setActive(pages.create('beaker://feed/#user/' + this.url.origin))
    } else {
      pages.setActive(pages.create(view))
    }
  }

  onThumbError () {
    this.didThumbLoadFail = true
    this.rerender()
  }
}
