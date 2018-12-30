/* globals location fetch */

import createMd from './lib/fg/markdown'

const md = createMd({allowHTML: true, useHeadingAnchors: true})

// make sure not already handled
// (for some reason, clicking on a # link inside the page triggers this script again)
if (!document.querySelector('main')) {
  // show formatted el
  var unformattedEl = document.querySelector('body > pre')
  var formattedEl = document.createElement('main')
  formattedEl.innerHTML = `<nav></nav><div class="markdown">${md.render(unformattedEl.textContent)}</div>`
  document.body.appendChild(formattedEl)
  unformattedEl.remove()

  // render the nav
  renderNav()
  async function renderNav () {
    var navHTML
    try {
      var navReq = await fetch('/nav.md?disable_fallback_page=1')
      if (!navReq.ok) return
      var navMD = await navReq.text()
      navHTML = md.render(navMD)
      document.querySelector('nav').innerHTML = navHTML
    } catch (e) {
      // do nothing
    }
  }

  // execute scripts
  var scriptEls = Array.from(document.querySelectorAll('script'))
  for (let scriptEl of scriptEls) {
    let clone = document.createElement('script')
    for (let i = 0; i < scriptEl.attributes.length; i++) {
      let attr = scriptEl.attributes[i]
      clone.setAttribute(attr.name, attr.value)
    }
    clone.textContent = scriptEl.textContent
    document.body.append(clone)
  }
}
