import yo from 'yo-yo'
import toggleable from './toggleable'

function getIcon (page) {
  switch (page) {
    case 'Library':
      return yo`<i class="fa fa-book"></i>`
    case 'Bookmarks':
      return yo`<i class="fa fa-star-o"></i>`
    case 'History':
      return yo`<i class="fa fa-history"></i>`
    case 'Downloads':
      return yo`<i class="fa fa-download"></i>`
    case 'Settings':
      return yo`<i class="fa fa-gear"></i>`
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
        ${currentPage !== 'Library'
          ? yo`
            <a href="beaker://library" class="dropdown-item">
              <i class="fa fa-book"></i>
              <span>Library</span>
            </a>`
          : ''
        }

        ${currentPage !== 'Bookmarks'
          ? yo`
            <a href="beaker://bookmarks" class="dropdown-item">
              <i class="fa fa-star-o"></i>
              <span>Bookmarks</span>
            </a>`
          : ''
        }

        ${currentPage !== 'History'
          ? yo`
            <a href="beaker://history" class="dropdown-item">
              <i class="fa fa-history"></i>
              <span>History</span>
            </a>`
          : ''
        }

        ${currentPage !== 'Downloads'
          ? yo`
            <a href="beaker://downloads" class="dropdown-item">
              <i class="fa fa-download"></i>
              <span>Downloads</span>
            </a>`
          : ''
        }

        ${currentPage !== 'Settings'
          ? yo`
            <a href="beaker://settings" class="dropdown-item ${currentPage === 'settings' ? 'active' : ''}">
              <i class="fa fa-gear"></i>
              <span>Settings</span>
            </a>`
          : ''
        }
      </div>
    </div>
  `)
}
