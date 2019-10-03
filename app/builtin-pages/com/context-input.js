import yo from 'yo-yo'
import * as contextMenu from './context-menu'

// exported api
// =

// create a new context input
// - returns a promise that will resolve to the given value
// - uses the context menu code
// - example usage:
/*
create({
  // where to put the input
  x: e.clientX,
  y: e.clientY,

  // input placeholder
  label: 'My input',

  // default value
  value: 'Foo',

  // button label
  action: 'Go!',

  // use triangle
  withTriangle: true,

  // post-render trigger
  postRender () {
    // do stuff
  }
}
*/
export function create (opts) {
  let {x, y, label, value, action, withTriangle, postRender} = opts
  value = value || ''
  label = label || ''
  action = action || 'Submit'

  // create context menu
  const p = contextMenu.create({
    render () {
      return yo`
        <div class="context-menu context-input dropdown" style="left: ${x}px; top: ${y}px">
          <div class="dropdown-items ${withTriangle ? 'with-triangle' : ''} left">
            <form onsubmit=${onSubmit}>
              <input type="text" placeholder=${label} name="in" value=${value} />
              <button type="submit" class="btn primary">${action}</button>
            </form>
          </div>
        </div>
      `
    }
  })

  // focus on the input
  document.querySelector('.context-input input').select()
  if (postRender) postRender()

  return p
}

// event handlers
// =

async function onSubmit (e) {
  e.preventDefault()
  contextMenu.destroy(e.target.in.value)
}
