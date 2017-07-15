/* globals DatArchive location */

import Remarkable from 'remarkable'

var md = new Remarkable('full', {
  html: true, // Enable HTML tags in source
  xhtmlOut: false, // Use '/' to close single tags (<br />)
  breaks: true, // Convert '\n' in paragraphs into <br>
  langPrefix: 'language-', // CSS language prefix for fenced blocks
  linkify: true, // Autoconvert URL-like text to links

  // Enable some language-neutral replacement + quotes beautification
  typographer: true,

  // Double + single quotes replacement pairs, when typographer enabled,
  // and smartquotes on. Set doubles to '«»' for Russian, '„“' for German.
  quotes: '“”‘’',

  // Highlighter function. Should return escaped HTML,
  // or '' if the source string is not changed
  highlight: function (/* str, lang */) { return '' }
})

// heading anchor rendering
md.renderer.rules.heading_open = function (tokens, idx /*, options, env */) {
  return '<h' + tokens[idx].hLevel + ' id="' + slugify(tokens[idx + 1].content) + '">'
}
md.renderer.rules.heading_close = function (tokens, idx /*, options, env */) {
  return '<a class="anchor-link" href="#' + slugify(tokens[idx - 1].content) + '">#</a></h' + tokens[idx].hLevel + '>\n'
}

// make sure not already handled
// (for some reason, clicking on a # link inside the page triggers this script again)
if (!document.querySelector('main')) {
  // show formatted el
  var unformattedEl = document.querySelector('body > pre')
  var formattedEl = document.createElement('main')
  formattedEl.innerHTML = `<nav></nav><div>${md.render(unformattedEl.textContent)}</div>`
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
    var self = new DatArchive(location.toString())
    try {
      var navMD = await self.readFile('/nav.md')
      navHTML = md.render(navMD)
      document.querySelector('nav').innerHTML = navHTML
    } catch (e) {
      // do nothing
    }
  }
}

function slugify (text) {
  // Regex for finding the nonsafe URL characters (many need escaping): & +$,:;=?@"#{}|^~[`%!'<>]./()*\
  var nonsafeChars = /[& +$,:;=?@"#{}|^~[`%!'<>\]./()*\\]/g
  var slug

  // Note: we trim hyphens after truncating because truncating can cause dangling hyphens.
  // Example string:                               // "⚡⚡ Don't forget: URL fragments should be i18n-friendly, hyphenated, short, and clean."
  slug = text.trim() // "⚡⚡ Don't forget: URL fragments should be i18n-friendly, hyphenated, short, and clean."
    .replace(/'/gi, '') // "⚡⚡ Dont forget: URL fragments should be i18n-friendly, hyphenated, short, and clean."
    .replace(nonsafeChars, '-') // "⚡⚡-Dont-forget--URL-fragments-should-be-i18n-friendly--hyphenated--short--and-clean-"
    .replace(/-{2,}/g, '-') // "⚡⚡-Dont-forget-URL-fragments-should-be-i18n-friendly-hyphenated-short-and-clean-"
    .replace(/^-+|-+$/gm, '') // "⚡⚡-Dont-forget-URL-fragments-should-be-i18n-friendly-hyphenated"
    .toLowerCase() // "⚡⚡-dont-forget-url-fragments-should-be-i18n-friendly-hyphenated"

  return slug
};
