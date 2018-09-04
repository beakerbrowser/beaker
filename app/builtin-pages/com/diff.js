/* globals hljs */

import yo from 'yo-yo'

// exported api
// =

export default function render (diff, path = '') {
  let pathExt = path.split('.').pop()

  let origIdx = 1
  let newIdx = 1

  let originalLinenos = []
  let newLinenos = []

  for (let i = 0; i < diff.length; i++) {
    const lineDiff = diff[i]

    if (lineDiff.added) {
      originalLinenos = originalLinenos.concat(Array(lineDiff.count).fill(' '))

      for (let j = 0; j < lineDiff.count; j++) {
        newLinenos.push((j + newIdx).toString())
      }
      newIdx += lineDiff.count
    } else if (lineDiff.removed) {
      newLinenos = newLinenos.concat(Array(lineDiff.count).fill(' '))

      for (let j = 0; j < lineDiff.count; j++) {
        originalLinenos.push((j + origIdx).toString())
      }
      origIdx += lineDiff.count
    } else {
      for (let j = 0; j < lineDiff.count; j++) {
        originalLinenos.push((j + origIdx).toString())
        newLinenos.push((j + newIdx).toString())
      }
      origIdx += lineDiff.count
      newIdx += lineDiff.count
    }
  }

  const lineEls = originalLinenos.map(l => yo`<div class="lineno">${l}</div>`)
  const lineEls2 = newLinenos.map(l => yo`<div class="lineno">${l}</div>`)

  return yo`
    <pre class="diff ${lineEls.length >= 100 ? 'digits4' : ''}">
      <div class="linenos">${lineEls}</div>
      <div class="linenos linenos2">${lineEls2}</div>
      ${diff.map(d => yo`<div class="content ${d.removed ? 'del' : d.added ? 'add' : ''}">${d.value}</div>`).map(el => highlight(el, pathExt))}
    </pre>
  `
}

// internal methods
// =

// helper to apply syntax highlighting
function highlight (diffEl, pathExt) {
  if (typeof window.hljs !== 'undefined') {
    let res = hljs.highlightAuto(diffEl.textContent, pathExt ? [pathExt] : undefined)
    if (res) diffEl.innerHTML = res.value
  }
  return diffEl
}
