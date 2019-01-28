import * as yo from 'yo-yo'

export function renderFollowedBy (followers, currentUserSession) {
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