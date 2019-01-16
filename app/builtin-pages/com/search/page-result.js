import yo from 'yo-yo'
import {makeSafe, highlight} from '../../../lib/strings'
import _get from 'lodash.get'

// exported api
// =

export default function render (pageInfo, currentUserSession, highlightNonce) {
  return yo`
    <div class="search-result page">
      <div class="details">
        <a class="link title" href=${pageInfo.url} title=${getTitle(pageInfo)}>${renderTitle(pageInfo, highlightNonce)}</a>
        <div class="author">
          by
          <a class="link" href=${pageInfo.author.url} title=${getAuthorTitle(pageInfo)}>
            <img src="${pageInfo.author.thumbUrl}">
            ${getAuthorTitle(pageInfo)}
          </a>
        </div>
        ${renderDescription(pageInfo, highlightNonce)}
      </div>
    </div>`
}

// rendering
// =

function renderTitle (pageInfo, highlightNonce) {
  var el = yo`<span></span>`
  el.innerHTML = highlight(makeSafe(getTitle(pageInfo)), highlightNonce)
  return el
}

function renderDescription (pageInfo, highlightNonce) {
  if (pageInfo.description) {
    var el = yo`<div class="description"></div>`
    el.innerHTML = highlight(makeSafe(pageInfo.description), highlightNonce)
    return el
  }
  return ''
}

function getTitle (pageInfo) {
  return _get(pageInfo, 'title') || 'Untitled'
}

function getAuthorTitle (pageInfo) {
  return _get(pageInfo, 'author.title') || 'Anonymous'
}