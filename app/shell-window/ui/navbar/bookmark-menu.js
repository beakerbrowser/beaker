/* globals beakerBrowser */

import * as yo from 'yo-yo'
import {findParent} from '../../../lib/fg/event-handlers'
import * as pages from '../../pages'
import * as navbar from '../navbar'

export class BookmarkMenuNavbarBtn {
  constructor () {
    this.values = {
      title: '',
      private: false
    }
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
                <input id="bookmark-title" type="text" name="title" value=${this.values.title} onkeyup=${e => this.onChangeTitle(e)}/>
              </div>

              <p class="visibility-info">
                ${this.values.private
                  ? 'This bookmark will not be shared with any of your friends.'
                  : 'This bookmark will be publicly visible.'}
              </p>

              <div class="input-group visibility">
                <input checked=${this.values.private} type="radio" name="visibility" id="private" value="private" onchange=${e => this.onChangeVisibility('private')}/>
                <label for="private" class="">
                  <i class="fa fa-lock"></i>
                  Private
                </label>

                <input checked=${!this.values.private} type="radio" name="visibility" id="public" value="public" onchange=${e => this.onChangeVisibility('public')}/>
                <label for="public">
                  Public
                  <i class="fa fa-globe"></i>
                </label>
              </div>

              <div>
                <button type="button" onclick=${e => this.onClickRemoveBookmark(e)}>Remove</button>
                ${this.doesNeedSave ? yo`<button type="submit">Save</button>` : ''}
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

  get doesNeedSave () {
    const page = pages.getActive()
    if (!page || !page.bookmark) {
      return false
    }
    const b = page.bookmark
    return (b.title !== this.values.title || b.private !== this.values.private)
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

  async onClickBookmark () {
    // toggle the dropdown bookmark editor
    this.isDropdownOpen = !this.isDropdownOpen

    if (this.isDropdownOpen) {
      var page = pages.getActive()

      if (!page.bookmark) {
        // set the bookmark privately
        await beaker.bookmarks.bookmarkPrivate(page.getIntendedURL(), {title: page.title || '', pinned: false})
        page.bookmark = await beaker.bookmarks.getBookmark(page.getIntendedURL())
        navbar.update()
      }

      // set form values
      this.values.private = page.bookmark.private
      this.values.title = page.bookmark.title
    }

    this.updateActives()
    if (this.isDropdownOpen) {
      document.getElementById('bookmark-title').focus()
    }
  }

  async onSaveBookmark (e) {
    e.preventDefault()
    var page = pages.getActive()
    if (!page.bookmark) {
      return this.close() // bookmark mustve gotten deleted by another tab
    }

    // update bookmark
    var b = page.bookmark
    b.title = this.values.title

    // delete old bookmark if privacy changed
    if (this.values.private && !b.private) {
      await beaker.bookmarks.unbookmarkPublic(b.href)
    } else if (!this.values.private && b.private) {
      await beaker.bookmarks.unbookmarkPrivate(b.href)
    }

    // create new bookmark
    if (this.values.private) {
      await beaker.bookmarks.bookmarkPrivate(b.href, b)
    } else {
      await beaker.bookmarks.bookmarkPublic(b.href, b)
    }
    page.bookmark = await beaker.bookmarks.getBookmark(b.href)
    navbar.update()
    this.close()
  }

  async onClickRemoveBookmark (e) {
    var page = pages.getActive()
    var b = page.bookmark
    if (!b) return
    if (b.private) {
      await beaker.bookmarks.unbookmarkPrivate(page.getIntendedURL())
    } else {
      await beaker.bookmarks.unbookmarkPublic(page.getIntendedURL())
    }
    page.bookmark = null
    navbar.update()
    this.close()
  }

  onChangeTitle (e) {
    this.values.title = e.target.value
    this.updateActives()
  }

  onChangeVisibility (v) {
    this.values.private = v === 'private'
    this.updateActives()
  }
}
