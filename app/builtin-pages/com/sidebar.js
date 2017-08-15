import yo from 'yo-yo'

export default function render (message) {
  return yo`
    <div class="sidebar">
      <a class="sidebar-link" href="beaker://start">
        <img class="grid" src="beaker://assets/icon/grid.svg"/>
        <span class="tooltip start">Start page</span>
      </a>
      <a class="sidebar-link" href="beaker://bookmarks">
        <img class="star" src="beaker://assets/icon/star.svg"/>
        <span class="tooltip">Bookmarks</span>
      </a>
      <a class="sidebar-link" href="beaker://history">
        <img class="history" src="beaker://assets/icon/history.svg"/>
        <span class="tooltip">History</span>
      </a>
    </div>
  `
}
