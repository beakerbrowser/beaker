import * as yo from 'yo-yo'
import * as pages from '../pages'

// exported functions
// =

export function createContainer (id) {
  // render
  var el = render(id, null)
  document.querySelector('#prompts').append(el)
  return el
}

export function destroyContainer (id) {
  var el = document.querySelector(`#prompts [data-id="${id}"]`)
  if (el) el.remove()
}

export function add (page, { type, render, duration, onForceClose }) {
  // if 'type' is set, only allow one of the type
  if (type) {
    for (var i = 0; i < page.prompts.length; i++) {
      if (page.prompts[i].type == type) { return false }
    }
  }

  // add the prompt
  var prompt = {
    type,
    render,
    onForceClose
  }
  page.prompts.push(prompt)
  update(page)

  // start the timeout if there's a duration
  if (duration) {
    setTimeout(() => remove(page, prompt), duration)
  }

  return true
}

export function remove (page, prompt) {
  if (!page.prompts) { return } // page no longer exists

  // find and remove
  var i = page.prompts.indexOf(prompt)
  if (i !== -1) {
    page.prompts.splice(i, 1)
    update(page)
    if (page.webviewEl) {
      // return focus to the page content
      page.webviewEl.focus()
    }
  }
}

export function forceRemoveAll (page) {
  if (!page.prompts) { return } // page no longer exists

  // find and remove
  page.prompts.forEach(p => {
    if (typeof p.onForceClose == 'function') { p.onForceClose() }
  })
  if (page.prompts.length && page.webviewEl) {
    // return focus to the page content
    page.webviewEl.focus()
  }
  page.prompts = []
  update(page)
}

export function update (page) {
  // fetch current page, if not given
  page = page || pages.getActive()
  if (!page.webviewEl) return

  // render
  yo.update(page.promptEl, render(page.id, page))
}

// internal methods
// =

function render (id, page) {
  if (!page) { return yo`<div data-id=${id} class="hidden"></div>` }

  return yo`<div data-id=${id} class=${page.isActive ? '' : 'hidden'}>
    ${page.prompts.map(prompt => {
      return yo`<div class="prompt">
        ${prompt.render({
          rerender: () => update(page),
          onClose: () => remove(page, prompt)
        })}
      </div>`
    })}
  </div>`
}
