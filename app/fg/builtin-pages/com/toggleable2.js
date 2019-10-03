import yo from 'yo-yo'
import { findParent } from '../../lib/event-handlers'

// globals
// =

// map of current state, for toggles that should persist state across renderings
var toggleState = {}
var afterCloses = {}

// exports
// =

// helper to add toggle behaviors
// pass in render functions for the open & closed states
// options:
// - id: optional, an ID string to persist the open state on page redraws
// - closed: required, a function to render closed state. Takes ({onToggle}).
// - open: required, a function to render open state. Takes ({onToggle}).
// - afterOpen: optional, a function called after open-state is rendered. Takes (containerEl).
// - afterClose: optional, a function called after close-state is rendered.
/*
import toggleable2 from 'toggleable2'

function render () {
  return toggleable2({
    id: 'foo',
    closed: ({onToggle}) => yo`
      <div class="toggleable-container">
        <button onclick=${onToggle}>toggle</button>
      </div>`,
    open: ({onToggle}) => yo`
      <div class="toggleable-container">
        <button onclick=${onToggle}>toggle</button>
        <div class="dropdown-items">
          ...
        </div>
      </div>`,
    afterOpen (el) {
      console.log('toggleable opened')
    },
    afterClose () {
      console.log('toggleable closed')
    }
  `)
}
*/

/**
 *
 * @param {Object} opts
 * @param {string} opts.id
 * @param {Function} opts.closed
 * @param {Function} opts.open
 * @param {Function} [opts.afterOpen]
 * @param {Function} [opts.afterClose]
 */
export default function toggleable2 ({id, closed, open, afterOpen, afterClose}) {
  function onToggle (e) {
    e.preventDefault()
    e.stopPropagation()

    var toggleableContainer = findParent(e.target, 'toggleable-container')
    set(toggleableContainer, !toggleableContainer.classList.contains('open'))
  }
  var callArgs = {onToggle}

  function set (container, newState, {isRestore} = {}) {
    closeAllToggleables()
    if (newState) {
      yo.update(container, open(callArgs))
      container.classList.add('open')
      if (afterOpen && !isRestore) afterOpen(container)
    } else {
      yo.update(container, closed(callArgs))
      container.classList.remove('open')
      if (afterClose) afterClose()
    }
    if (id) {
      // persist state
      toggleState[id] = newState
      afterCloses[id] = afterClose
    }
  }

  // create el
  var el = closed(callArgs)

  // restore state if id given
  if (id && toggleState[id]) {
    set(el, true, {isRestore: true})
  }

  return el
}

export function closeAllToggleables () {
  Array.from(document.querySelectorAll('.toggleable-container')).forEach(el => el.classList.remove('open'))
  for (let k in toggleState) {
    if (afterCloses[k]) {
      afterCloses[k]()
    }
  }
  toggleState = {}
  afterCloses = {}
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
