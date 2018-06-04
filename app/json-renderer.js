import JSONFormatter from 'json-formatter-js'

const TWOMB = 2097152 // in bytes

function parse (str) {
  if (str === '') return false
  if (str.length > TWOMB) return false // too much json, bro
  try {
    return JSON.parse(str)
  } catch (e) {
    return false
  }
}

var views = {
  unformatted: document.querySelector('body > pre'),
  formatted: undefined
}
var navBtns = {
  unformatted: document.createElement('span'),
  formatted: document.createElement('span')
}
navBtns.unformatted.textContent = 'Raw'
navBtns.formatted.textContent = 'Formatted'

function setView (view) {
  for (var k in views) {
    views[k].classList.add('hidden')
    navBtns[k].classList.remove('pressed')
  }
  views[view].classList.remove('hidden')
  navBtns[view].classList.add('pressed')
}

Object.keys(navBtns).forEach(view => {
  navBtns[view].style.userSelect = 'none'
  navBtns[view].addEventListener('click', () => setView(view))
})

// try to parse
var obj = parse(views.unformatted.textContent)
if (obj) {
  // render the formatted el
  var formatter = new JSONFormatter(obj, 1, {
    hoverPreviewEnabled: true,
    hoverPreviewArrayCount: 100,
    hoverPreviewFieldCount: 5,
    animateOpen: false,
    animateClose: false,
    useToJSON: true
  })
  views.formatted = formatter.render()
  document.body.append(views.formatted)

  // render the nav
  var nav = document.createElement('nav')
  nav.append(navBtns.formatted)
  nav.append(navBtns.unformatted)
  document.body.prepend(nav)

  // set the current view
  setView('formatted')
}
