import * as yo from 'yo-yo'
import renderDotsIcon from '../icon/three-dots.js'

export default function tabs (current, tabs) {
  return yo`
    <div class="nav">
      ${tabs.map(tab => {
        var cls = 'tab nav-item'
        if (tab.id === current) {
          cls += ' active'
        }
        return yo`<span class=${cls} onclick=${tab.onclick}>${tab.label}</span>`
      })}

      <span class="nav-item dropdown">
        ${renderDotsIcon()}
      </span>
    </div>
  `
}
