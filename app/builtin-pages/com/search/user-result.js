import yo from 'yo-yo'
import {renderFollowedBy} from '../user/followers'
import {makeSafe, highlight} from '../../../lib/strings'
import {findParent, pushUrl} from '../../../lib/fg/event-handlers'

// exported api
// =

export default function render (userInfo, currentUserSession, highlightNonce) {
  const targetUrl = `/?source=${encodeURIComponent(userInfo.url)}`
  const isFollowing = getIsUserFollowing(userInfo, currentUserSession)
  return yo`
    <div class="search-result user">
      <a class="thumb" href=${targetUrl} onclick=${pushUrl}>
        <img src=${userInfo.thumbUrl}>
      </a>
      <div class="details">
        <a class="link title" href=${targetUrl} title=${getTitle(userInfo)} onclick=${pushUrl}>
          ${renderTitle(userInfo, highlightNonce)}${renderFollowsYou(userInfo)}
        </a>
        ${renderDescription(userInfo, highlightNonce)}
        ${renderFollowedBy(userInfo.followedBy, currentUserSession)}
      </div>
      <div class="ctrls">
        <a class="btn small" onclick=${e => onToggleFollowing(e, userInfo, currentUserSession, highlightNonce)}>${isFollowing ? 'Unfollow' : 'Follow'}</a>
      </div>
    </div>`
}

// rendering
// =

function renderTitle (userInfo, highlightNonce) {
  var el = yo`<span></span>`
  el.innerHTML = highlight(makeSafe(getTitle(userInfo)), highlightNonce)
  return el
}

function renderDescription (userInfo, highlightNonce) {
  if (userInfo.description) {
    var el = yo`<div class="description"></div>`
    el.innerHTML = highlight(makeSafe(userInfo.description), highlightNonce)
    return el
  }
  return ''
}

function renderFollowsYou (userInfo) {
  if (userInfo.followsUser) return yo`<span class="follows-user">Follows you</span>`
  return ''
}

function getTitle (userInfo) {
  if (userInfo.title) return userInfo.title
  return 'Anonymous'
}

function getIsUserFollowing (userInfo, currentUserSession) {
  return userInfo.followedBy.filter(f => f.url === currentUserSession.url).length > 0
}

// event handlers
// =

async function onToggleFollowing (e, userInfo, currentUserSession, highlightNonce) {
  var resultEl = findParent(e.currentTarget, 'search-result')
  var isCurrentlyFollowing = getIsUserFollowing(userInfo, currentUserSession)
  if (isCurrentlyFollowing) {
    await beaker.followgraph.unfollow(userInfo.url)
  } else {
    await beaker.followgraph.follow(userInfo.url)
  }
  userInfo.followedBy = await beaker.followgraph.listFollowers(userInfo.url, {includeDesc: true})
  yo.update(resultEl, render(userInfo, currentUserSession, highlightNonce))
}
