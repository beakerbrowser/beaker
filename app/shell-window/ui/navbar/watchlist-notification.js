/* globals beaker */

import * as yo from 'yo-yo'
import {findParent} from '../../../lib/fg/event-handlers'
import * as pages from '../../pages'

export class WatchlistNotificationBtn {
  constructor () {
    this.resolved = 0

    var wlEvents = beaker.watchlist.createEventsStream()
    wlEvents.addEventListener('resolved', () => {
      this.resolved++
      this.updateActives()
    })
  }

  render () {
    if (this.resolved === 0) {
      return yo`<div class="watchlist-notification"></div>`
    }

    return yo`
      <div class="watchlist-notification">
        <button class="toolbar-btn watchlist-notification-btn" onclick=${e => this.onClickBtn(e)} title="Watchlist">
          <span class="fa fa-eye"></span>
          <span class="badge">${this.resolved}</span>
        </button>
      </div>`
  }

  updateActives () {
    Array.from(document.querySelectorAll('.watchlist-notification')).forEach(el => yo.update(el, this.render()))
  }

  onClickBtn (e) {
    this.resolved = 0
    pages.setActive(pages.create('beaker://watchlist'))
    this.updateActives()
  }
}
