import * as yo from 'yo-yo'
import * as contextMenu from './context-menu'

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
  const {x, y, label, value, action} = opts

  // create context menu
  const p = contextMenu.create({
    render () {
      return yo`
        <div class="context-menu context-input dropdown" style="left: ${x}px; top: ${y}px">
          <div class="dropdown-items with-triangle left">
            <form onsubmit=${onSubmit}>
              <input type="text" placeholder=${label} name="in" value=${value} />
              <button type="submit" class="btn primary">${action || 'Submit'}</button>
            </form>
          </div>
        </div>
      `
    }
  })

  // focus on the input
  document.querySelector('.context-input input').select()

  return p
}

// event handlers
// =

async function onSubmit (e) {
  e.preventDefault()
  contextMenu.destroy(e.target.in.value)
}