import yo from 'yo-yo'
import toggleable from './toggleable'

function getIcon (page) {
  switch (page) {
    case 'Library':
      return yo`<i class="fa fa-book"></i>`
    case 'Bookmarks':
      return yo`<i class="far fa-star"></i>`
    case 'History':
      return yo`<i class="fa fa-history"></i>`
    case 'Downloads':
      return yo`<i class="fa fa-download"></i>`
    case 'Settings':
      return yo`<i class="fas fa-cog"></i>`
    case 'Watchlist':
      return yo`<i class="fa fa-eye"></i>`
    default:
      return ''
  }
}

export default function render (currentPage = '') {
  return toggleable(yo`
    <div
      class="dropdown toggleable-container builtin-pages-nav"
      data-toggle-id="builtin-pages-nav-menu"
    >
      <button class="btn transparent toggleable">
        <h1>
          ${getIcon(currentPage)}
          ${currentPage}
        </h1>

        <i class="fa fa-caret-down"></i>
      </button>

      <div class="dropdown-items subtle-shadow left">
        <a href="beaker://start" class="dropdown-item">
          <span class="fa fa-home"></span>
          <span>Home</span>
        </a>

        <a href="beaker://feed" class="dropdown-item">
          <i class="fa fa-list-ul"></i>
          <span>Feed</span>
        </a>

        <a href="beaker://bookmarks" class="dropdown-item">
          <i class="fa fa-star-o"></i>
          <span>Bookmarks</span>
        </a>

        <a href="beaker://library" class="dropdown-item">
          <i class="fa fa-book"></i>
          <span>Library</span>
        </a>

        <a href="beaker://history" class="dropdown-item">
          <i class="fa fa-history"></i>
          <span>History</span>
        </a>

        <a href="beaker://downloads" class="dropdown-item">
          <i class="fa fa-download"></i>
          <span>Downloads</span>
        </a>

        <a href="beaker://watchlist" class="dropdown-item">
          <i class="fa fa-eye"></i>
          <span>Watchlist</span>
        </a>

        <a href="beaker://settings" class="dropdown-item ${currentPage === 'settings' ? 'active' : ''}">
          <i class="fa fa-gear"></i>
          <span>Settings</span>
        </a>
      </div>
    </div>
  `)
}
