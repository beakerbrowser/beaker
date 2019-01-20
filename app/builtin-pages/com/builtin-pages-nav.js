import yo from 'yo-yo'
import toggleable from './toggleable'

const PAGES = [
  // ['beaker://timeline/', 'Timeline'], DISABLED -prf
  ['beaker://library/', 'Your Library'],
  ['beaker://search/', 'Search'],
  ['beaker://bookmarks/', 'Bookmarks'],
  ['beaker://history/', 'History'],
  ['beaker://watchlist/', 'Watchlist'],
  ['beaker://downloads/', 'Downloads'],
  ['beaker://settings/', 'Settings']
]

// exported api
// =

export default function render (currentUrl, currentPage) {
  return toggleable(yo`
    <div
      class="dropdown toggleable-container builtin-pages-nav"
      data-toggle-id="builtin-pages-nav-menu"
    >
      <a class="toggleable">
        <img src=${`beaker-favicon:${currentUrl}`}>
        ${currentPage}
      </a>

      <div class="dropdown-items subtle-shadow left roomy">
        ${PAGES.map(([url, label]) => yo`
          <a href=${url} class="dropdown-item">
            <img src=${'beaker-favicon:' + url} />
            <span>${label}</span>
          </a>
        `)}
      </div>
    </div>
  `)
}
