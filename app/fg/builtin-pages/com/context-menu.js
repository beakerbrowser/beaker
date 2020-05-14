import yo from 'yo-yo'
import {findParent} from '../../lib/event-handlers'

// globals
// =

var resolve

var x, y // where the menu goes
var right // align edge to right instead of left
var withTriangle
var items // the current dropdown items

// exported api
// =

// create a new context menu
// - returns a promise that will resolve to undefined when the menu goes away
// - example usage:
/*
create({
  // where to put the menu
  x: e.clientX,
  y: e.clientY,

  // align edge to right instead of left
  right: true,

  // use triangle
  withTriangle: true,

  // parent element to append to
  parent: document.body,

  // menu items
  items: [
    // icon from font-awesome
    {icon: 'link', label: 'Copy link', click: () => writeToClipboard('...')}
  ]

  // instead of items, can give render()
  render ({x, y}) {
    return yo`
      <div class="context-menu dropdown" style="left: ${x}px; top: ${y}px">
        <img src="smile.png" onclick=${contextMenu.destroy} />
      </div>
    `
  }
}
*/
export function create (opts) {
  // destroy any existing
  destroy()

  // extract attrs
  x = opts.x
  y = opts.y
  right = opts.right || false
  withTriangle = opts.withTriangle || false
  items = opts.items
  var parent = opts.parent || document.body

  // render interface
  const el = opts.render ? opts.render(opts) : render(opts)
  parent.appendChild(el)
  document.addEventListener('keyup', onKeyUp)
  document.addEventListener('click', onClickAnywhere)

  // return promise
  return new Promise(_resolve => {
    resolve = _resolve
  })
}

export function destroy (value) {
  const el = document.querySelector('.context-menu')
  if (el) {
    el.parentNode.removeChild(el)
    document.removeEventListener('keyup', onKeyUp)
    document.removeEventListener('click', onClickAnywhere)
    resolve(value)
  }
}

// rendering
// =

function render () {
  return yo`
    <div class="context-menu dropdown" style="left: ${x}px; top: ${y}px">
      <div class="dropdown-items ${right ? 'right' : 'left'} ${withTriangle ? 'with-triangle' : ''}">
        ${items.map(item => {
          if (item === '-') {
            return yo`<hr />`
          }
          var icon = item.icon
          if (icon && !icon.includes(' ')) {
            icon = 'fa fa-' + icon
          }
          if (item.disabled) {
            return yo`
              <div class="dropdown-item disabled">
                ${icon !== false ? yo`<i class="${icon}"></i>` : ''}
                ${item.label}
              </div>
            `
          }
          return yo`
            <div class="dropdown-item" onclick=${() => { destroy(); item.click() }}>
              ${icon !== false ? yo`<i class="${icon}"></i>` : ''}
              ${item.label}
            </div>
          `
        })}
      </div>
    </div>
  `
}

// event handlers
// =

function onKeyUp (e) {
  e.preventDefault()
  e.stopPropagation()

  if (e.keyCode === 27) {
    destroy()
  }
}

function onClickAnywhere (e) {
  if (!findParent(e.target, 'context-menu')) {
    // click is outside the context-menu, destroy
    destroy()
  }
}
