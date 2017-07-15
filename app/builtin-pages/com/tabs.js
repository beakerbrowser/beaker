import * as yo from 'yo-yo'

export default function tabs (current, tabs) {
  return yo`
    <div class="tabs">
      ${tabs.map(tab => {
    var cls = 'tab'
    if (tab.id === current) {
      cls += ' active'
    }
    return yo`<a class=${cls} onclick=${tab.onclick}>${tab.label}</a>`
  })}
    </div>
  `
}
