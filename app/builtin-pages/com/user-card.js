import yo from 'yo-yo'

// exported api
// =

export default function render (userInfo, currentUserSession) {
  return yo`
    <a class="user-card" href=${userInfo.url} title=${userInfo.title}>
      <div class="thumb">
        <img src=${getThumbUrl(userInfo)}>
      </div>
      <div class="title">${userInfo.title || 'Anonymous'}</div>
      ${userInfo.description ? yo`<div class="description">${userInfo.description}</div>` : ''}
      ${renderFollowers(userInfo.followedBy, currentUserSession)}
      ${userInfo.followsUser ? yo`<div class="follows-user">Follows you</div>` : ''}
    </a>`
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

function getHostname (url) {
  return (new URL(url)).hostname
}