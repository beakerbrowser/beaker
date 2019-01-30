import yo from 'yo-yo'
import {renderFollowedBy} from '../user/followers'

// exported api
// =

export function renderSourceBanner ({sourceInfo, currentUserSession, onEditProfile, onToggleFollowSource}) {
  const isSelf = sourceInfo.url === currentUserSession.url
  const isFollowed = sourceInfo.isFollowed
  return yo`
    <div class="source-banner">
      <div class="thumb"><img src="${sourceInfo.url}/thumb"></div>
      <div class="details">
        <div class="title">${sourceInfo.title}</div>
        <div class="description">${sourceInfo.description}</div>
        ${isSelf
          ? yo`<div><span class="isyou">This is you!</span></div>`
          : renderFollowedBy(sourceInfo.followers, currentUserSession)}
      </div>
      <div class="actions">
        ${isSelf
          ? yo`<button class="btn"><i class="fas fa-pencil-alt" onclick=${onEditProfile}></i> Edit profile</button>`
          : isFollowed
            ? yo`<button class="btn" onclick=${() => onToggleFollowSource(false)}><i class="fas fa-rss red-x"></i> Unfollow</button>`
            : yo`<button class="btn" onclick=${() => onToggleFollowSource(true)}><i class="fas fa-rss"></i> Follow</button>`}
        <a class="btn" href=${sourceInfo.url} target="_blank"><i class="fas fa-external-link-alt"></i> Visit website</a>
      </div>
    </div>`
}

export function renderSourceSubnav ({sourceView, onChangeSourceView}) {
  const item = (id, label) => (
    yo`<a
        class=${id === sourceView ? `active` : ''}
        onclick=${() => onChangeSourceView(id)}
      >${label}</a>`
  )
  return yo`
    <div class="source-subnav">
      ${item('profile', 'Profile')}
      ${item('followers', 'Followers')}
      ${item('following', 'Following')}
    </div>`
}