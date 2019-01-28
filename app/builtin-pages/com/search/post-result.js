import yo from 'yo-yo'
import {makeSafe, highlight} from '../../../lib/strings'
import {niceDate} from '../../../lib/time'
import {pushUrl} from '../../../lib/fg/event-handlers'
import _get from 'lodash.get'

// exported api
// =

export default function render (post, currentUserSession, highlightNonce) {
  return yo`
    <div class="search-result post">
      <div class="details">
        <a class="link title" href=${post.content.url} title=${getTitle(post)}>${renderTitle(post, highlightNonce)}</a>
        <div>${renderDescription(post, highlightNonce)}</div>
        <div class="meta">
          link
          <a class="author link" href="/?source=${encodeURIComponent(post.author.url)}" onclick=${pushUrl} title=${getAuthorTitle(post)}>
            <img src="${post.author.thumbUrl}">
            ${getAuthorTitle(post)}
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

function getTitle (post) {
  return _get(post, 'content.title') || 'Untitled'
}

function getAuthorTitle (post) {
  return _get(post, 'author.title') || 'Anonymous'
}