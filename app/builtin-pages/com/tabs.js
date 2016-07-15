import * as yo from 'yo-yo'

export default function render (tabs, selected) {
  return yo`<div class="tabs">
    ${tabs.map((t, i) => yo`<a class=${i === selected ? 'selected' : ''} onclick=${t.onclick}>${t.label}</a>`)}
  </div>`
}