import { findParent } from '../../lib/event-handlers'

// globals
// =

// map of current state, for toggles that should persist state across renderings
var toggleState = {}

// exports
// =

// helper to add toggle behaviors
// give class .toggleable, .toggleon, or .toggleoff to trigger
// include data-toggle-on="event", where `event` sets what triggers toggle (default click)
// include data-toggle-id if you want to keep the toggle state across renderings

// if you want to render on open, include a .toggleable-open-container el and pass in a render func as the second argument

export default function toggleable (el, optRenderOpenContent = null) {
  var id = el.dataset.toggleId

  el.classList.add('toggleable-container')
  // restore toggle state
  if (id && toggleState[id]) {
    el.classList.add('open')
    renderOpenContent()
  }

  Array.from(el.querySelectorAll('.toggleable')).forEach(el2 => {
    el2.addEventListener(el2.dataset.toggleOn || 'click', onToggle)
  })
  Array.from(el.querySelectorAll('.toggleon')).forEach(el2 => {
    el2.addEventListener(el2.dataset.toggleOn || 'click', onToggleOn)
  })
  Array.from(el.querySelectorAll('.toggleoff')).forEach(el2 => {
    el2.addEventListener(el2.dataset.toggleOn || 'click', onToggleOff)
  })

  function onToggle (e) {
    e.preventDefault()
    e.stopPropagation()
    var newState = !el.classList.contains('open')
    closeAllToggleables()
    if (newState) {
      el.classList.add('open')
      renderOpenContent()
    }
    if (id) {
      // persist state
      toggleState[id] = newState
    }
  }
  function onToggleOn (e) {
    e.preventDefault()
    e.stopPropagation()
    el.classList.add('open')
    renderOpenContent()
    if (id) {
      // persist state
      toggleState[id] = true
    }
  }
  function onToggleOff (e) {
    e.preventDefault()
    e.stopPropagation()
    el.classList.remove('open')
    if (id) {
      // persist state
      toggleState[id] = false
    }
  }
  function renderOpenContent () {
    if (optRenderOpenContent) {
      var container = el.querySelector('.toggleable-open-container')
      if (container) {
        container.innerHTML = ''
        container.appendChild(optRenderOpenContent())
      }
    }
  }
  return el
}

export function closeAllToggleables () {
  Array.from(document.querySelectorAll('.toggleable-container')).forEach(el => el.classList.remove('open'))
  toggleState = {}
}

export function closeToggleable (el) {
  while (el && el.classList && el.classList.contains('toggleable-container') === false) {
    el = el.parentNode
  }
  if (el && el.classList) {
    // update dom
    el.classList.remove('open')

    // persist
    var id = el.dataset.toggleId
    if (id) {
      toggleState[id] = false
    }
  }
}

// event listeners
document.addEventListener('click', function (e) {
  // if click happens outside of .toggleable-container, close all toggleables
  if (!findParent(e.target, 'toggleable-container')) {
    closeAllToggleables()
  }
})

document.addEventListener('keyup', function (e) {
  if (e.keyCode === 27) closeAllToggleables()
})
// NOTE
// look through the commit history for a much nicer version of this
// there was an edgecase in the old version that I couldnt make work
// so, here we are, with 'data-toggle-on' and shit
// -prf
