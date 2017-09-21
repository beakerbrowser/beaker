/* globals beaker.browser */

import * as yo from 'yo-yo'
import {findParent} from '../../../lib/fg/event-handlers'
import * as pages from '../../pages'
import * as navbar from '../navbar'

export class BookmarkMenuNavbarBtn {
  constructor () {
    this.justCreatedBookmark = false // did we create the bookmark on open?
    this.values = {
      title: '',
      notes: '',
      tags: '',
      private: false,
      pinned: false
    }
    this.isDropdownOpen = false
    this.isPrivacyDropdownOpen = false
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
                <label for="title">Title:</label>
                <input class="bookmark-title" type="text" name="title" value=${this.values.title} onkeyup=${e => this.onChangeTitle(e)}/>
              </div>

              <div class="input-group">
                <label>Tags:</label>
                <input type="text" name="tags" value=${this.values.tags} onkeyup=${e => this.onChangeTags(e)}/>
              </div>

              <div class="input-group">
                <label>Notes:</label>
                <textarea class="bookmark-notes" name="notes" onkeyup=${e => this.onChangeNotes(e)}>${this.values.notes}</textarea>
              </div>

              <div class="input-group privacy">
                <label>Privacy:</label>

                <div class="privacy-wrapper">
                  <input onclick=${e => this.onChangeVisibility(e, 'private')} type="radio" id="privacy-private" name="privacy" value="private" checked=${this.values.private}/>
                  <label class="btn" for="privacy-private">
                    <i class="fa fa-lock"></i>
                    Private
                  </label>

                  <input onclick=${e => this.onChangeVisibility(e, 'public')} type="radio" id="privacy-public" name="privacy" value="public" checked=${!this.values.private}/>
                  <label class="btn" for="privacy-public">
                    <i class="fa fa-globe"></i>
                    Public
                  </label>
                </div>
              </div>

              <div class="input-group pinned">
                <label>
                  <input onchange=${(e) => this.onChangePinned(e)} checked=${this.values.pinned || false} type="checkbox" name="pinned" value="pinned">
                  Pin to start page
                </label>
              </div>

              <div class="buttons">
                <button type="button" class="btn remove" onclick=${e => this.onClickRemoveBookmark(e)}>
                  Remove
                </button>

                <button class="btn primary" type="submit" disabled=${!this.doesNeedSave}>
                  Save
                </button>
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
      <button class="star ${bookmarkBtnClass}" title="Bookmark this page" onclick=${e => this.onClickBookmark(e)}>
        <span class="star ${page && page.bookmark ? 'fa fa-star' : 'fa fa-star-o'}"></span>
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
    return (
      this.justCreatedBookmark ||
      b.title !== this.values.title ||
      tagsToString(b.tags) !== this.values.tags ||
      b.notes !== this.values.notes ||
      b.private !== this.values.private ||
      b.pinned !== this.values.pinned
    )
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
        this.justCreatedBookmark = true
        navbar.update()
      } else {
        this.justCreatedBookmark = false
      }

      // set form values
      this.values.private = page.bookmark.private
      this.values.title = page.bookmark.title
      this.values.tags = tagsToString(page.bookmark.tags)
      this.values.notes = page.bookmark.notes
      this.values.pinned = page.bookmark.pinned
    }

    this.updateActives()

    // select the title input
    document.querySelectorAll('.bookmark-title').forEach(el => {
      el.focus()
      el.select()
    })
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
    b.tags = this.values.tags.split(' ').filter(Boolean)
    b.notes = this.values.notes

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

    // set the pinned status of the bookmark
    await beaker.bookmarks.setBookmarkPinned(b.href, this.values.pinned)

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

  onChangeTags (e) {
    this.values.tags = e.target.value
    this.updateActives()
  }

  onChangeNotes (e) {
    this.values.notes = e.target.value
    this.updateActives()
  }

  onChangePinned (e) {
    this.values.pinned = e.target.checked
    this.updateActives()
  }

  onChangeVisibility (e, v) {
    e.stopPropagation()
    this.values.private = v === 'private'
    this.isPrivacyDropdownOpen = false
    this.updateActives()
  }

  onTogglePrivacyDropdown () {
    this.isPrivacyDropdownOpen = !this.isPrivacyDropdownOpen
    this.updateActives()
  }
}

function tagsToString (tags) {
  return (tags || []).join(' ')
}
