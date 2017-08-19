import yo from 'yo-yo'
import renderGridIcon from '../icon/grid'
import renderStarIcon from '../icon/star'
import renderHistoryIcon from '../icon/history'
import renderGearIcon from '../icon/gear'
import renderAvatarIcon from '../icon/avatar'

export default function render (activePage) {
  return yo`
    <div class="sidebar dark">
      <a class="sidebar-link avatar ${activePage === 'profile' ? 'active' : ''}" href="beaker://profile">
        ${renderAvatarIcon()}
        <span class="tooltip avatar">Your profile</span>
      </a>
      <a class="sidebar-link ${activePage === 'start' ? 'active' : ''}" href="beaker://start">
        ${renderGridIcon()}
        <span class="tooltip start">Start page</span>
      </a>
      <a class="sidebar-link ${activePage === 'bookmarks' ? 'active' : ''}" href="beaker://bookmarks">
        ${renderStarIcon()}
        <span class="tooltip">Bookmarks</span>
      </a>
      <a class="sidebar-link ${activePage === 'history' ? 'active' : ''}" href="beaker://history">
        ${renderHistoryIcon()}
        <span class="tooltip">History</span>
      </a>
      <a class="sidebar-link ${activePage === 'settings' ? 'active' : ''}" href="beaker://settings">
        ${renderGearIcon()}
        <span class="tooltip">Settings</span>
      </a>
    </div>
  `
}
