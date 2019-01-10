import yo from 'yo-yo'
import {makeSafe, highlight} from '../../lib/strings'

// exported api
// =

export default function render (userInfo, currentUserSession, highlightNonce) {
  if (!userInfo.author) return '' // must have information about the user (as of writing, all info about followed users has an author)
  return yo`
    <div class="user-card">
      <div class="thumb">
        <img src=${getThumbUrl(userInfo)}>
      </div>
      <div class="details">
        <a class="link title" href=${userInfo.url} title=${getTitle(userInfo)}>${renderTitle(userInfo, highlightNonce)}${renderFollowsYou(userInfo)}</a>
        <div class="hostname">${getFakeHostname(userInfo.url)}</div>
        ${renderDescription(userInfo, highlightNonce)}
        ${renderFollowers(userInfo.followedBy, currentUserSession)}
      </div>
      <div class="ctrls">
        <a class="btn">Follow</a>
      </div>
    </div>`
}

function renderTitle (userInfo, highlightNonce) {
  var el = yo`<span></span>`
  el.innerHTML = highlight(makeSafe(getTitle(userInfo)), highlightNonce)
  return el
}

function renderDescription (userInfo, highlightNonce) {
  // if (Math.random() > 0.5) return yo`<div class="description">Head of development at FooBar Inc. Mother, wife, hacker, gamer, part-time wedding DJ. Dont mess with me!</div>`
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

function getThumbUrl (userInfo) {
  try {
    return userInfo.author.url + '/data/known_sites/' + getHostname(userInfo.url) + '.jpg'
  } catch (e) {
    console.error('Failed to construct thumb url', e)
    return ''
  }
}

function getTitle (userInfo) {
  // if (Math.random() > 0.5) return 'Alice Allison'
  // if (Math.random() > 0.5) return 'Carla C. Carlson'
  if (userInfo.title) return userInfo.title
  return 'Anonymous'
}

function getFakeHostname (url) {
  // if (Math.random() > 0.5) return 'alice.com'
  // if (Math.random() > 0.5) return 'alice.hashbase.io'
  return (new URL(url)).hostname
}

function getHostname (url) {
  return (new URL(url)).hostname
}