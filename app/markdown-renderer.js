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

  // give ui to switch
  var a = document.createElement('a')
  a.className = 'switcher'
  a.textContent = 'Raw'
  a.onclick = (e) => {
    e.preventDefault()
    if (formattedEl.style.display !== 'none') {
      formattedEl.style.display = 'none'
      unformattedEl.style.display = 'block'
      a.textContent = 'Formatted'
    } else {
      formattedEl.style.display = 'flex'
      unformattedEl.style.display = 'none'
      a.textContent = 'Raw'
    }
  }
  document.body.appendChild(a)

  // render the nav
  renderNav()
  async function renderNav () {
    var navHTML
    try {
      var navMD = await (await fetch('/nav.md')).text()
      navHTML = md.render(navMD)
      document.querySelector('nav').innerHTML = navHTML
    } catch (e) {
      // do nothing
    }
  }
}
