import Remarkable from 'remarkable'

var md = new Remarkable('full', {
  html:         false,        // Enable HTML tags in source
  xhtmlOut:     false,        // Use '/' to close single tags (<br />)
  breaks:       true,         // Convert '\n' in paragraphs into <br>
  langPrefix:   'language-',  // CSS language prefix for fenced blocks
  linkify:      true,         // Autoconvert URL-like text to links

  // Enable some language-neutral replacement + quotes beautification
  typographer:  true,

  // Double + single quotes replacement pairs, when typographer enabled,
  // and smartquotes on. Set doubles to '«»' for Russian, '„“' for German.
  quotes: '“”‘’',

  // Highlighter function. Should return escaped HTML,
  // or '' if the source string is not changed
  highlight: function (/*str, lang*/) { return ''; }
});

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
    } catch (e) {
      var listing = await self.listFiles('/', {depth: 0})
      navHTML = Object.keys(listing)
        .filter(name => name.endsWith('md'))
        .sort()
        .map(name => `<a href="/${makeSafe(name)}">${makeSafe(name)}</a>`)
        .join('')
    }
    document.querySelector('nav').innerHTML = navHTML
  }
  function makeSafe (str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
}