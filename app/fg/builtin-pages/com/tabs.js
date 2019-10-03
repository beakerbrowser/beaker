import yo from 'yo-yo'

export default function tabs (current, tabs) {
  return yo`
    <div class="tabs">
      ${tabs.map(tab => {
        var cls = 'tab nav-item'
        if (tab.id === current) {
          cls += ' active'
        }
        return yo`<span class=${cls} onclick=${tab.onclick}>${tab.label}</span>`
      })}
    </div>
  `
}
