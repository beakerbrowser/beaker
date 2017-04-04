import * as yo from 'yo-yo'

// exported api
// =

export default function render (menu) {
  return yo`
    <div class="dropdown-menu-bar">
      ${menu.map(item => {
        return yo`
          <div class="item top-item">${item.label}</div>
        `
      })}
    </div>
  `
}