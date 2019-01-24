import yo from 'yo-yo'
import {makeSafe, highlight} from '../../../lib/strings'
import {niceDate} from '../../../lib/time'
import {getBasicType} from '../../../lib/dat'
import _get from 'lodash.get'
import {renderType} from './util'

// exported api
// =

export default function render (post, currentUserSession, highlightNonce) {
  return yo`
    <div class="search-result post">
      <div class="details">
        <a class="link title" href=${post.content.url} title=${getTitle(post)}>${renderTitle(post, highlightNonce)}</a>
        <div>
          ${renderDescription(post, highlightNonce)}
        </div>
        <div>
          <a class="author link" href=${post.author.url} title=${getAuthorTitle(post)}>
            <img src="${post.author.thumbUrl}">
            ${getAuthorTitle(post)}
          </a>
          <span class="timestamp">
            Posted ${niceDate(post.createdAt)}
          </span>
          <span class="timestamp">
            Crawled ${niceDate(post.crawledAt)}
          </span>
          ${renderType(getBasicType(post.type))}
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
  if (post.description) {
    var el = yo`<span class="description"></span>`
    el.innerHTML = highlight(makeSafe(_get(post, 'content.description', '')), highlightNonce)
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