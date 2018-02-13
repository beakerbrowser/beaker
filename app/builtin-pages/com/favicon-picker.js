import * as yo from 'yo-yo'
import * as contextMenu from './context-menu'

// globals
// =

var builtinFaviconsList
var selectedFavicon
var loadError
var onSelect

var filter
var showSmall = false

// exported api
// =

// create a new favicon picker
// - returns a promise that will resolve to undefined when the menu goes away
// - uses the context menu code
// - example usage:
/*
create({
  // where to put the picker
  x: e.clientX,
  y: e.clientY,

  // method called with selection
  onSelect (imageData) {
    // write imageData to favicon.png
  }
}
*/
export function create (opts) {
  const {x, y} = opts
  onSelect = opts.onSelect

  // load the favicons if needed
  if (!builtinFaviconsList) {
    beaker.browser.listBuiltinFavicons()
      .catch(err => {
        loadError = err
        console.error('Error loading builtin favicons', err)
      })
      .then(bfl => {
        builtinFaviconsList = bfl
        rerender()
      })
  }

  // create context menu
  return contextMenu.create({
    render () {
      return yo`
        <div class="context-menu dropdown" style="left: ${x}px; top: ${y}px">
          ${render()}
        </div>
      `
    }
  })
}

// internal methods
// =

function rerender () {
  const el = document.body.querySelector('.favicon-picker')
  if (el) yo.update(el, render())
}

function render () {
  return yo`
    <div class="dropdown-items left favicon-picker">
      <div class="favicon-picker-header">
        <div class="filter">
          <input type="text" placeholder="Filter" onkeyup=${onChangeFilter} />
        </div>
        <div class="ctrls">
          <div class="btn-group">
            <a class="btn small ${showSmall ? 'pressed' : ''}" onclick=${() => onShowSmall(true)}>16px</a>
            <a class="btn small ${showSmall ? '' : 'pressed'}" onclick=${() => onShowSmall(false)}>32px</a>
          </div>
        </div>
      </div>
      <div class="favicon-picker-body">${renderBody()}</div>
      <div class="favicon-picker-footer">
        <div class="label">Select new favicon</div>
        <div class="ctrls">
          <a class="btn ${selectedFavicon ? '' : 'disabled'} primary" onclick=${onClickSelect}>Select</a>
        </div>
      </div>
    </div>
  `
}

function renderBody () {
  if (!builtinFaviconsList && !loadError) {
    return yo`<div class="text">Loading...</div>`
  }
  if (loadError) {
    return yo`<div class="text">${loadError.toString()}</div>`
  }
  return yo`
    <div class="favicon-picker-icons ${showSmall ? 'small' : ''}">
      ${builtinFaviconsList.filter(applyFilter).map(name => {
        return yo`
          <div
            class="icon ${selectedFavicon === name ? 'selected' : ''}"
            onclick=${() => onClickIcon(name)}
          >
            <img src="beaker://assets/favicons/${name}" />
          </div>
        `
      })}
    </div>
  `
}

function applyFilter (name) {
  if (!filter) return true
  return filter.test(name)
}

// event handlers
// =

function onClickIcon (v) {
  selectedFavicon = v
  rerender()
}

function onShowSmall (v) {
  showSmall = v
  rerender()
}

function onChangeFilter (e) {
  const v = e.currentTarget.value
  filter = v ? new RegExp(v, 'i') : false
  rerender()
}

async function onClickSelect () {
  if (!selectedFavicon) return
  contextMenu.destroy()
  onSelect(await beaker.browser.getBuiltinFavicon(selectedFavicon))
}