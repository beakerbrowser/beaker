import yo from 'yo-yo'
import {makeSafe, highlight} from '../../../lib/strings'
import {niceDate} from '../../../lib/time'
import {getBasicType} from '../../../lib/dat'
import _get from 'lodash.get'
import {renderType} from './util'

// exported api
// =

export default function render (site, currentUserSession, highlightNonce) {
  return yo`
    <div class="search-result site">
      <div class="details">
        <a class="link title" href=${site.url} title=${getTitle(site)}>${renderTitle(site, highlightNonce)}</a>
        <div>
          ${renderDescription(site, highlightNonce)}
        </div>
        <div>
          <a class="author link" href=${site.author.url} title=${getAuthorTitle(site)}>
            <img src="${site.author.thumbUrl}">
            ${getAuthorTitle(site)}
          </a>
          <span class="timestamp">
            Crawled ${niceDate(site.crawledAt)}
          </span>
          ${renderType(getBasicType(site.type))}
        </div>
      </div>
    </div>`
}

// rendering
// =

function renderTitle (site, highlightNonce) {
  var el = yo`<span></span>`
  el.innerHTML = highlight(makeSafe(getTitle(site)), highlightNonce)
  return el
}

function renderDescription (site, highlightNonce) {
  if (site.description) {
    var el = yo`<span class="description"></span>`
    el.innerHTML = highlight(makeSafe(site.description), highlightNonce)
    return el
  }
  return ''
}

function getTitle (site) {
  return _get(site, 'title') || 'Untitled'
}

function getAuthorTitle (site) {
  return _get(site, 'author.title') || 'Anonymous'
}