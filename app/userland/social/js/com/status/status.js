import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import statusCSS from '../../../css/com/status/status.css.js'
import { timeDifference } from '../../lib/time.js'
import { findParent, emit } from '../../lib/dom.js'
import { writeToClipboard } from '../../lib/clipboard.js'
import * as contextMenu from '../context-menu.js'
import * as toast from '../toast.js'

const RENDER_LIMIT = 280

export class Status extends LitElement {
  static get properties () {
    return {
      status: {type: Object},
      userUrl: {type: String, attribute: 'user-url'},
      expanded: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.status = null
    this.userUrl = ''
    this.expanded = false
  }

  get isTooLong () {
    return !this.expanded && this.status.content.length > RENDER_LIMIT
  }

  get isLiked () {
    // well, I like to think I am...
    return this.status && this.status.likedBy && this.status.likedBy.find(drive => drive.url === this.userUrl)
  }

  render () {
    if (!this.status || !this.status.content) return
    var viewProfileUrl = '/' + this.status.drive.url.slice('dat://'.length) // TODO
    var viewStatusUrl = viewProfileUrl + '/status/' + this.status.url.split('/').pop()
    var content = this.expanded ? this.status.content : this.status.content.slice(0, RENDER_LIMIT)
    var isLiked = this.isLiked
    var likesTooltip = 'Liked by:\n' + this.status.likedBy.slice(0, 4).map(drive => drive.title).join('\n')
    if (this.status.likedBy.length > 4) {
      likesTooltip += `\nand ${this.status.likedBy.length - 4} more`
    }
    return html`
      <link rel="stylesheet" href="/webfonts/fontawesome.css">
      <div class="inner" @click=${this.onTopClick}>
        <a class="avatar" href="${viewProfileUrl}"><img src="asset:thumb:${this.status.drive.url}?cache_buster=${Date.now()}"></a>
        <div class="content-column">
          <div class="header">
            <div class="header-line">
              <a class="title" href="${viewProfileUrl}">${this.status.drive.title}</a>
              <a class="date" href=${viewStatusUrl}>${timeDifference(this.status.stat.ctime, true, 'ago')}</a>
              <a class="id" href="${viewProfileUrl}">TODO@beaker.network</a>
              <button class="menu transparent" @click=${this.onClickMenu}><span class="fas fa-fw fa-ellipsis-h"></span></button>
            </div>
          </div>
          <div class="body">${content}${this.isTooLong ? '...' : ''}</div>
          ${this.isTooLong ? html`<a class="readmore" href="#">Read more</a>` : ''}
          ${''/* TODO <div class="embed">
            <div class="embed-thumb">
              <img src="asset:thumb:dat://f12cadfff9d8389a95c361408d1b1869072fe10f8da5ba364078d40398a293e4">
            </div>
            <div class="embed-details">
              <div class="embed-title">Paul Frazee</div>
              <div class="embed-type"><i class="fas fa-file-alt"></i> Website</div>
              <div class="embed-description">The Beaker guy</div>
          </div>*/}
          <div class="footer">
            <a class="comments" @click=${this.onTopClick}>
              <span class="far fa-fw fa-comment"></span>
              ${this.status.numComments}
            </a>
            <a class="likes ${isLiked ? 'selected' : ''}" @click=${this.onLikeClick} data-tooltip=${likesTooltip}>
              <span class="${isLiked ? 'fas' : 'far'} fa-fw fa-heart"></span>
              ${this.status.likedBy.length}
            </a>
          </div>
        </div>
      </div>
    `
  }

  // events
  // =

  onTopClick (e) {
    // make sure this wasn't a click on a link within the status
    var aEl = findParent(e.target, el => el.tagName === 'A' || el === e.currentTarget)
    if (aEl !== e.currentTarget && aEl.getAttribute('href') !== '#') {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    emit(this, 'expand', {detail: {status: this.status}})
  }

  onLikeClick (e) {
    e.preventDefault()
    e.stopPropagation()
    emit(this, 'toggle-like', {detail: {status: this.status}})
  }

  onClickMenu (e) {
    e.preventDefault()
    e.stopPropagation()

    var items = [
      {icon: 'far fa-fw fa-file-alt', label: 'View status', click: () => window.open(this.status.url) },
      {
        icon: 'fas fa-fw fa-link',
        label: 'Copy status URL',
        click: () => {
          writeToClipboard(this.status.url)
          toast.create('Copied to your clipboard')
        }
      }
    ]

    if (this.userUrl === this.status.drive.url) {
      items.push('-')
      items.push({icon: 'fas fa-fw fa-trash', label: 'Delete status', click: () => this.onClickDelete() })
    }

    var rect = e.currentTarget.getClientRects()[0]
    contextMenu.create({
      x: rect.right + 4,
      y: rect.bottom + 8,
      right: true,
      withTriangle: true,
      roomy: true,
      noBorders: true,
      style: `padding: 4px 0`,
      items
    })
  }

  onClickDelete () {
    if (!confirm('Are you sure?')) return
    emit(this, 'delete', {bubbles: true, composed: true, detail: {status: this.status}})
  }
}
Status.styles = statusCSS

customElements.define('beaker-status', Status)