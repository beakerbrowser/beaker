import yo from 'yo-yo'

// exported api
// =

export default function render (diff) {
  return yo`<div class="diff">
    ${diff.map(d => yo`<div class=${d.removed ? 'del' : d.added ? 'add' : ''}>${d.value}</div>`)}
  </div>`
}