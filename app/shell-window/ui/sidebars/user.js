/* globals DatArchive */

import * as yo from 'yo-yo'
import {BaseSidebar} from './base'

// exported api
// =

export class UserSidebar extends BaseSidebar {
  static shouldRender (page) {
    return page.siteInfo && page.siteInfo.type.includes('unwalled.garden/user.json')
  }

  constructor (page) {
    super(page)
    this.info = null
    this.load()
  }

  render () {
    if (!this.info) return ''
    var url = new URL(this.page.url)
    return yo`
      <div class="user-sidebar">
        <div class="card">
          <img src="${url.origin}/thumb.jpg">
          <div class="title">${this.info.title}</div>
          <div class="description">${this.info.description}</div>
          <div class="followers sepbottom"><span class="fa fa-user"></span>Followed by <a class="link">Tara Vancil</a></div>
          <div class="sepbottom">
            <div class="btn"><span class="fa fa-plus"></span> Follow</div>
          </div>
          <div>
            <div><a class="link">View Feed</a></div>
            <div><a class="link">View Bookmarks</a></div>
            <div><a class="link">View Library</a></div>
          </div>
        </div>
      </div>`
  }

  async load () {
    let dat = new DatArchive(this.page.url)
    this.info = JSON.parse(await dat.readFile('/dat.json'))
    this.rerender()
  }
}
