import yo from 'yo-yo'
import {makeSafe, highlight} from '../../../lib/strings'
import {niceDate} from '../../../lib/time'
import {pushUrl} from '../../../lib/fg/event-handlers'
import {getTypeLabel} from '@beaker/core/lib/dat'
import _get from 'lodash.get'
import toggleable, {closeAllToggleables} from '../toggleable2'

// exported api
// =

export default function render ({site, currentUserSession, highlightNonce, onClickLinkType, onUnpublishSite}) {
  const isOwner = site.author.url === currentUserSession.url
  return yo`
    <div class="search-result site">
      <div class="details">
        ${isOwner ? renderOwnerControls({site, onUnpublishSite}) : ''}
        <a class="link title" href=${site.url} title=${getTitle(site)}>${renderTitle(site, highlightNonce)}</a>
        <div>${renderDescription(site, highlightNonce)}</div>
        <div class="meta">
          <a class="author link" href="/?source=${encodeURIComponent(site.author.url)}" onclick=${pushUrl} title=${getAuthorTitle(site)}>
            <img src="${site.author.thumbUrl}">
            ${getAuthorTitle(site)}
          </a>
          <a class="type" onclick=${onClickLinkType ? e => onClickLinkType(site.type) : undefined}>
            ${getTypeLabel(site.type)}
          </a>
          <span class="timestamp">
            Crawled ${niceDate(site.crawledAt)}
          </span>
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

function renderOwnerControls ({site, onUnpublishSite}) {
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
                <div class="dropdown-item" onclick=${e => { closeAllToggleables(); onUnpublishSite(site) }}>
                  <i class="fas fa-times"></i>
                  Unpublish site
                </div>
              </div>
            </div>
          `
        }
      })}
    </div>`
}

function getTitle (site) {
  return _get(site, 'title') || 'Untitled'
}

function getAuthorTitle (site) {
  return _get(site, 'author.title') || 'Anonymous'
}