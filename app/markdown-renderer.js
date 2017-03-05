import Remarkable from 'remarkable'

var md = new Remarkable({
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

// hide unformatted el
var unformattedEl = document.querySelector('body > pre')
unformattedEl.style.display = 'none'

// show formatted el
var formattedEl = document.createElement('div')
formattedEl.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif'
formattedEl.style.margin = '1em'
formattedEl.innerHTML = md.render(unformattedEl.textContent)
document.body.appendChild(formattedEl)

// give ui to switch
var a = document.createElement('a')
a.setAttribute('href', '#')
a.style.position = 'absolute'
a.style.top = '5px'
a.style.right = '5px'
a.textContent = 'Raw'
a.onclick = (e) => {
  e.preventDefault()

  if (unformattedEl.style.display === 'none') {
    formattedEl.style.display = 'none'
    unformattedEl.style.display = 'block'
    a.textContent = 'Formatted'
  } else {
    formattedEl.style.display = 'block'
    unformattedEl.style.display = 'none'
    a.textContent = 'Raw'
  }
}
document.body.appendChild(a)