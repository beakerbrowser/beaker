import yo from 'yo-yo'
import {makeSafe, highlight} from '../../../lib/strings'
import _get from 'lodash.get'

// exported api
// =

export default function render (postInfo, currentUserSession, highlightNonce) {
  return yo`
    <div class="search-result post">
      <div class="content">${renderContent(postInfo, highlightNonce)}</div>
      <div class="details">
        <div class="author">
          by
          <a class="link" href=${postInfo.author.url} title=${getAuthorTitle(postInfo)}>
            <img src="${postInfo.author.thumbUrl}">
            ${getAuthorTitle(postInfo)}
          </a>
        </div>
        <div class="timestamp">
          <a href=${postInfo.url}>${getCreatedAt(postInfo)}</a>
        </div>
      </div>
    </div>`
}

function renderContent (postInfo, highlightNonce) {
  var el = yo`<span></span>`
  el.innerHTML = highlight(makeSafe(postInfo.content), highlightNonce)
  return el
}

function getAuthorTitle (postInfo) {
  return _get(postInfo, 'author.title') || 'Anonymous'
}

function getCreatedAt (postInfo) {
  return (new Date(postInfo.createdAt)).toLocaleString()
}