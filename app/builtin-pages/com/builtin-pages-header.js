import yo from 'yo-yo'
import * as onboardingPopup from '../com/onboarding-popup'

// exported api
// =

export default function render (currentPage, currentUserSession) {
  const navItem = (url, icon, label) => yo`<a href="${url}" class="${label === currentPage ? 'active': ''}"><span class="fa ${icon}"></span> ${label}</a>`
  return yo`
    <div class="builtin-header fixed">
      <div class="nav">
        ${navItem('beaker://start', 'fa-home', 'Home')}
        ${navItem('beaker://bookmarks', 'fa-star-o', 'Bookmarks')}
        ${navItem('beaker://feed', 'fa-list-ul', 'Feed')}
        ${navItem('beaker://search', 'fa-search', 'Search')}
      </div>
      <div class="flex-spacer"></div>
      <div class="nav">
        ${navItem('beaker://library', 'fa-hdd-o', 'Library')}
      </div>
      ${renderHelpButton()}
      ${''/* TODO <div class="notifications" data-count="0">
        <span class="fa fa-bell-o"></span>
      </div>*/}
      ${currentUserSession ? yo`
        <div class="profile">
          <a href="${currentUserSession.url}"><img src="${currentUserSession.url}/thumb.jpg"></a>
        </div>`
        : ''}
    </div>`
}

// internal methods
// =

function renderHelpButton () {
  return yo`
    <button class="btn plain help" onclick=${onClickHelpButton}>
      <i class="fa fa-question-circle-o"></i>
    </button>`
}

async function onClickHelpButton () {
  await onboardingPopup.create({showHelpOnly: true})
}