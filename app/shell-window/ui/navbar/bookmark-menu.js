/* globals beaker */

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
      pinned: false,
      seeding: true,
      saved: true
    }
    this.isDropdownOpen = false
    this.allTags = null
    this.tagsAutocompleteResults = null
    this.tagsAutocompleteIdx = 0
    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  render () {
    var page = pages.getActive()
    const url = page ? page.getIntendedURL() : ''

    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = yo`
        <div class="dropdown bookmark-menu-dropdown">
          <div class="dropdown-items bookmark-menu-dropdown-items with-triangle">
            <div class="header">
              <i class="fas fa-star"></i>
              Edit this bookmark
            </div>

            <form onsubmit=${e => this.onSaveBookmark(e)}>
              <div class="input-group">
                <label for="title">Title:</label>
                <input class="bookmark-title" type="text" name="title" value=${this.values.title} onkeyup=${e => this.onChangeTitle(e)}/>
              </div>

              <div class="input-group tags">
                <label>Tags:</label>
                <input type="text" placeholder="Separate with spaces" name="tags" onfocus=${e => this.moveCursorToEnd(e)} value=${this.values.tags} onkeydown=${e => this.onPreventTab(e)} onkeyup=${e => this.onChangeTags(e)} onblur=${() => { this.tagsAutocompleteResults=null }}/>
                ${this.tagsAutocompleteResults ? yo`
                  <div class="autocomplete-results">
                    ${this.tagsAutocompleteResults.map((t, i) => yo`<div onclick=${e => this.onClickAutocompleteTag(e)} class="result ${i === this.tagsAutocompleteIdx ? 'selected' : ''}">${t}`)}
                  </div>
                ` : ''}
              </div>

              ${''/*TODO(profiles) disabled -prf
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
              </div>*/}

              <div>
                <h3>Other options</h3>

                <label class="toggle">
                  <input onchange=${(e) => this.onChangePinned(e)} checked=${this.values.pinned || false} type="checkbox" name="pinned" value="pinned">
                  <div class="switch"></div>
                  <span class="text">Pin to start page</span>
                </label>

                ${''/* TODO disabled for now -prf url.startsWith('dat://') && page.siteInfo && !page.siteInfo.isOwner
                  ? yo`
                    <label class="toggle">
                      <input onchange=${(e) => this.onChangeSeeding(e)} checked=${this.values.seeding || false} type="checkbox" name="seeding" value="seeding">
                      <div class="switch"></div>
                      <span class="text">Help seed these files</span>
                    </label>`
                  : ''
                */}
              </div>

              <div class="buttons">
                <button type="button" class="btn remove" onclick=${e => this.onClickRemoveBookmark(e)}>
                  Remove bookmark
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
        <span class="star ${page && page.bookmark ? 'fas fa-star' : 'far fa-star'}"></span>
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
      b.pinned !== this.values.pinned ||
      b.saved !== this.values.seeding ||
      b.seeding !== this.values.saved
    )
  }

  close () {
    this.tagsAutocompleteResults = null
    this.tagsQuery = null
    this.tagsAutocompleteIdx = 0
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false
    }
    this.updateActives()
  }

  onClickAnywhere (e) {
    var parent = findParent(e.target, 'bookmark-navbar-menu')
    if (parent) return // abort - this was a click on us!
    this.close()
  }

  moveCursorToEnd (e) {
    e.target.selectionStart = e.target.selectionEnd = e.target.value.length
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
      this.values.saved = page.siteInfo && page.siteInfo.userSettings && page.siteInfo.userSettings.isSaved
      this.values.seeding = this.values.saved && page.siteInfo && page.siteInfo.userSettings && page.siteInfo.userSettings.networked
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

    // TODO
    // set seeding/saved value

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

  async onChangeTags (e) {
    if (this.tagsAutocompleteResults) {
      // scroll up in autocomplete results
      if (e.keyCode === 38 && this.tagsAutocompleteIdx > 0) {
        this.tagsAutocompleteIdx -= 1
      }
      // scroll down in autocomplete results
      else if (e.keyCode === 40 && this.tagsAutocompleteIdx < this.tagsAutocompleteResults.length - 1) {
        this.tagsAutocompleteIdx += 1
      }
      // on TAB, add the selected tag autocomplete result
      else if (e.keyCode === 9) {
        e.target.value += this.tagsAutocompleteResults[this.tagsAutocompleteIdx].slice(this.tagsQuery.length) + ' '
        this.tagsAutocompleteResults = null
        this.tagsAutocompleteIdx = 0
      }
    }

    if (e.target.value !== this.values.tags) {
      await this.handleTagAutocompleteResults(e.target.value)
    }
    this.values.tags = e.target.value
    this.updateActives()
  }

  async handleTagAutocompleteResults (tagStr) {
    // if this.allTags not set, fetch the user's bookmark tags
    if (!this.allTags) {
      this.allTags = await beaker.bookmarks.listBookmarkTags(0)
    }

    // split the e.target.value to get the last "tag entry"
    const tagsArr = tagStr.split(' ')
    this.tagsQuery = tagsArr[tagsArr.length - 1]
    if (this.tagsQuery.length) {
      this.tagsAutocompleteResults = this.allTags.filter(t => t.startsWith(this.tagsQuery))
    } else {
      // reset the autocomplete results
      this.tagsAutocompleteResults = null
      this.tagsAutocompleteIdx = 0
    }
  }

  onClickAutocompleteTag (e) {
    this.values.tags += e.target.innerText.slice(this.tagsQuery.length) + ' '
    this.tagsAutocompleteResults = null
    this.tagsAutocompleteIdx = 0
    this.updateActives()
  }

  onPreventTab (e) {
    if (this.tagsAutocompleteResults && e.keyCode === 9) {
      e.preventDefault()
    }
  }

  onChangeNotes (e) {
    this.values.notes = e.target.value
    this.updateActives()
  }

  async onChangePinned (e) {
    this.values.pinned = e.target.checked
    this.updateActives()

    // go ahead and update the bookmark
    var page = pages.getActive()
    if (!page.bookmark) {
      return this.close() // bookmark mustve gotten deleted by another tab
    }
    await beaker.bookmarks.setBookmarkPinned(page.bookmark.href, this.values.pinned)
    page.bookmark.pinned = this.values.pinned
  }

  onChangeSeeding (e) {
    this.values.seeding = e.target.checked
    this.updateActives()
  }

  onChangeSaved (e) {
    this.values.saved = e.target.checked
    this.updateActives()
  }

  onChangeVisibility (e, v) {
    e.stopPropagation()
    this.values.private = v === 'private'
    this.isPrivacyDropdownOpen = false
    this.updateActives()
  }
}

function tagsToString (tags) {
  return (tags || []).join(' ')
}
