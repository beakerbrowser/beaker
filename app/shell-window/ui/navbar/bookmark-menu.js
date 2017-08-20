/* globals beakerBrowser */

import * as yo from 'yo-yo'
import {findParent} from '../../../lib/fg/event-handlers'
import * as pages from '../../pages'

export class BookmarkMenuNavbarBtn {
  constructor () {
    this.isPrivate = true
    this.isDropdownOpen = false
    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  render () {
    var page = pages.getActive()

    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = yo`
        <div class="dropdown bookmark-menu-dropdown">
          <div class="dropdown-items bookmark-menu-dropdown-items with-triangle">
            <div class="header">
              <i class="fa fa-star"></i>
              Edit this bookmark
            </div>

            <form onsubmit=${e => this.onSaveBookmark(e)}>
              <div class="input-group">
                <label for="title">Title</label>
                <input id="bookmark-title" type="text" name="title" value=${page && page.bookmark ? page.bookmark.title : ''}/>
              </div>

              <p class="visibility-info">
                ${this.isPrivate
                  ? 'This bookmark will not be shared with any of your friends.'
                  : 'This bookmark will be publicly visible.'}
              </p>

              <div class="input-group visibility">
                <input checked=${this.isPrivate} type="radio" name="visibility" id="private" value="private" onchange=${e => this.onChangeVisibility('private')}/>
                <label for="private" class="">
                  <i class="fa fa-lock"></i>
                  Private
                </label>

                <input checked=${!this.isPrivate} type="radio" name="visibility" id="public" value="public" onchange=${e => this.onChangeVisibility('public')}/>
                <label for="public">
                  Public
                  <i class="fa fa-globe"></i>
                </label>
              </div>

              <div>
                <button type="button" onclick=${e => this.onClickRemoveBookmark(e)}>Remove</button>
                <button type="submit">Save</button>
              </div>
            </form>
          </div>
        </div>
      `
    }

    // bookmark toggle state
    var bookmarkBtnClass = 'nav-bookmark-btn' + ((page && !!page.bookmark) ? ' active' : '')

    // render btn
    return yo`<div class="bookmark-navbar-menu">
      <button class="star ${bookmarkBtnClass}" title="Bookmark this page">
        <span class="star ${page && page.bookmark ? 'fa fa-star' : 'fa fa-star-o'}" onclick=${e => this.onClickBookmark(e)}></span>
      </button>
      ${dropdownEl}
    </div>`
  }

  updateActives () {
    Array.from(document.querySelectorAll('.bookmark-navbar-menu')).forEach(el => yo.update(el, this.render()))
  }

  close () {
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false
      this.updateActives()
    }
  }

  onClickAnywhere (e) {
    var parent = findParent(e.target, 'bookmark-navbar-menu')
    if (parent) return // abort - this was a click on us!
    this.close()
  }

  async onClickBookmark (e) {
    var page = pages.getActive()
    console.log(page.bookmark)
    if (!page.bookmark) {
      // set the bookmark privately
      await beaker.bookmarks.bookmarkPrivate(page.url, {title: page.title || '', pinned: false})
      page.bookmark = await beaker.bookmarks.getBookmark(page.url)
      this.isPrivate = true
    } else {
      this.isPrivate = page.bookmark.private
    }

    // toggle the dropdown bookmark editor
    this.isDropdownOpen = true
    this.updateActives()
    document.getElementById('bookmark-title').focus()
  }

  async onSaveBookmark (e) {
    e.preventDefault()
    var page = pages.getActive()
    if (!page.bookmark) {
      return this.close() // bookmark mustve gotten deleted by another tab
    }

    // update bookmark
    var b = page.bookmark
    b.title = e.target.title.value || ''

    // delete old bookmark if privacy changed
    if (this.isPrivate && !b.private) {
      await beaker.bookmarks.unbookmarkPublic(b.href)
    } else if (!this.isPrivate && b.private) {
      await beaker.bookmarks.unbookmarkPrivate(b.href)
    }

    // create new bookmark
    if (this.isPrivate) {
      await beaker.bookmarks.bookmarkPrivate(b.href, b)
    } else {
      await beaker.bookmarks.bookmarkPublic(b.href, b)
    }
    this.close()
  }

  async onClickRemoveBookmark (e) {
    var page = pages.getActive()
    var b = page.bookmark
    if (!b) return
    if (b.private) {
      await beaker.bookmarks.unbookmarkPrivate(page.url)
    } else {
      await beaker.bookmarks.unbookmarkPublic(page.url)
    }
    page.bookmark = null
    this.close()
  }

  onChangeVisibility (v) {
    this.isPrivate = v === 'private'
    this.updateActives()
  }
}
