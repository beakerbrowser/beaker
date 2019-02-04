import yo from 'yo-yo'
import {makeSafe, highlight} from '../../../lib/strings'
import {niceDate} from '../../../lib/time'
import {pushUrl} from '../../../lib/fg/event-handlers'
import {getTypeLabel} from '@beaker/core/lib/dat'
import _get from 'lodash.get'
import toggleable, {closeAllToggleables} from '../toggleable2'

// exported api
// =

export default function render ({post, currentUserSession, highlightNonce, onClickLinkType, onDeleteLinkPost}) {
  const isOwner = post.author.url === currentUserSession.url
  return yo`
    <div class="search-result post">
      <div class="details">
        ${isOwner ? renderOwnerControls({post, onDeleteLinkPost}) : ''}
        <a class="link title" href=${post.content.url} title=${getTitle(post)}>${renderTitle(post, highlightNonce)}</a>
        <div>${renderDescription(post, highlightNonce)}</div>
        <div class="meta">
          <a class="author link" href="/?source=${encodeURIComponent(post.author.url)}" onclick=${pushUrl} title=${getAuthorTitle(post)}>
            <img src="${post.author.thumbUrl}">
            ${getAuthorTitle(post)}
          </a>
          <a class="type" onclick=${onClickLinkType ? e => onClickLinkType(post.content.type) : undefined}>
            ${getTypeLabel(post.content.type, 'link')}
          </a>
          <span class="timestamp">
            Posted ${niceDate(post.createdAt)}
          </span>
          <span class="timestamp">
            Crawled ${niceDate(post.crawledAt)}
          </span>
        </div>
      </div>
    </div>`
}

// rendering
// =

function renderTitle (post, highlightNonce) {
  var el = yo`<span></span>`
  el.innerHTML = highlight(makeSafe(getTitle(post)), highlightNonce)
  return el
}

function renderDescription (post, highlightNonce) {
  var description = _get(post, 'content.description')
  if (description) {
    var el = yo`<span class="description"></span>`
    el.innerHTML = highlight(makeSafe(description), highlightNonce)
    return el
  }
  return ''
}

function renderOwnerControls ({post, onDeleteLinkPost}) {
  return yo`
    <div class="owner-controls">
      ${toggleable({
        id: 'owner-controls-menu',
        closed ({onToggle}) {
          return yo`
            <div class="dropdown menu toggleable-container">
              <button class="btn small transparent" onclick=${onToggle}><span class="fas fa-cog"></span></button>
            </div>`
        },
        open ({onToggle}) {
          return yo`
            <div class="dropdown menu toggleable-container">
              <button class="btn small transparent" onclick=${onToggle}><span class="fas fa-cog"></span></button>
              <div class="dropdown-items thin roomy right">
                <div class="dropdown-item" onclick=${e => { closeAllToggleables(); onDeleteLinkPost(post) }}>
                  <i class="fas fa-times"></i>
                  Delete link post
                </div>
              </div>
            </div>
          `
        }
      })}
    </div>`
}

function getTitle (post) {
  return _get(post, 'content.title') || 'Untitled'
}

function getAuthorTitle (post) {
  return _get(post, 'author.title') || 'Anonymous'
}