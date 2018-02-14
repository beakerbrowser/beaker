import * as yo from 'yo-yo'
import * as contextMenu from './context-menu'

// globals
// =

var builtinFaviconsList
var selectedFavicon
var loadError
var onSelect

var filter

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
  var builtinFaviconsGroups = toGroups(builtinFaviconsList.filter(applyFilter))
  return yo`
    <div>
      ${builtinFaviconsGroups.map(group => {
        if (!group.icons.length) return ''
        return [
          yo`<div class="favicon-picker-heading">${group.label}</div>`,
          yo`
            <div class="favicon-picker-icons">
              ${group.icons.map(name => {
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
        ]
      })}
    </div>
  `
}

function applyFilter (name) {
  if (!filter) return true
  return filter.test(name)
}

function toGroups (list) {
  var groups = {}
  list.forEach(name => {
    let [groupId] = name.split('-')
    groups[groupId] = groups[groupId] || {label: groupId, icons: []}
    groups[groupId].icons.push(name)
  })
  return Object.values(groups)
}

// event handlers
// =

function onClickIcon (v) {
  selectedFavicon = v
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