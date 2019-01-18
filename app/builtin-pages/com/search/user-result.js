import yo from 'yo-yo'
import {makeSafe, highlight} from '../../../lib/strings'
import {findParent} from '../../../lib/fg/event-handlers'

// exported api
// =

export default function render (userInfo, currentUserSession, highlightNonce) {
  const isFollowing = getIsUserFollowing(userInfo, currentUserSession)
  return yo`
    <div class="search-result user">
      <div class="thumb">
        <img src=${userInfo.thumbUrl}>
      </div>
      <div class="details">
        <a class="link title" href=${userInfo.url} title=${getTitle(userInfo)}>${renderTitle(userInfo, highlightNonce)}${renderFollowsYou(userInfo)}</a>
        <div class="hostname">${getHostname(userInfo.url)}</div>
        ${renderDescription(userInfo, highlightNonce)}
        ${renderFollowers(userInfo.followedBy, currentUserSession)}
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

function renderFollowers (followers, currentUserSession) {
  var nFollowers = followers.length
  if (!followers || nFollowers === 0) {
    return yo`<div class="followed-by"><span class="fa fa-user"></span> Followed by nobody you follow</div>`
  }
  followers = followers.map((follower, i) => {
    var sep = ''
    if (nFollowers > 2) {
      if (i === nFollowers - 2) {
        sep = ', and '
      } else if (i < nFollowers - 2) {
        sep = ', '
      }
    } else if (nFollowers === 2 && i === 0) {
      sep = ' and '
    }
    if (follower.url === currentUserSession.url) return yo`<span>you${sep}</span>`
    return yo`<span><a class="link" href=${follower.url} title=${follower.title}>${follower.title}</a>${sep}</span>`
  })

  return yo`
    <div class="followed-by">
      <span class="fa fa-user"></span>
      Followed by
      ${followers}
    </div>`
}

function getTitle (userInfo) {
  if (userInfo.title) return userInfo.title
  return 'Anonymous'
}

function getHostname (url) {
  return (new URL(url)).hostname
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
