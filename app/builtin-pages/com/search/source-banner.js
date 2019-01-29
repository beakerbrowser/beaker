import yo from 'yo-yo'
import {renderFollowedBy} from '../user/followers'

// exported api
// =

export function renderSourceBanner (sourceInfo, currentUserSession) {
  const isSelf = sourceInfo.url === currentUserSession.url
  return yo`
    <div class="source-banner">
      <div class="thumb"><img src="${sourceInfo.url}/thumb"></div>
      <div class="details">
        <div class="title">${sourceInfo.title}</div>
        <div class="description">${sourceInfo.description}</div>
        ${isSelf
          ? yo`<div><span class="isyou">This is you!</span></div>`
          : renderFollowedBy([], currentUserSession)}
      </div>
      <div class="actions">
        ${isSelf
          ? yo`<button class="btn thick"><i class="fas fa-pencil-alt"></i> Edit profile</button>`
          : yo`<button class="btn thick"><i class="fas fa-rss"></i> Follow</button>`}
        <a class="btn thick" href=${sourceInfo.url} target="_blank"><i class="fas fa-external-link-alt"></i> Visit website</a>
      </div>
    </div>`
}