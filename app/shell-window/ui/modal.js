import {ipcRenderer} from 'electron'
import yo from 'yo-yo'
import * as pages from '../pages'
import modalFns from './modals/index'

// globals
// =

var modalsDiv = document.querySelector('#modals')

// exported functions
// =

export function setup () {
  document.body.addEventListener('keydown', onGlobalKeydown)
}

export function createContainer (id) {
  // render
  var el = render(id, null)
  modalsDiv.append(el)
  return el
}

export function destroyContainer (id) {
  var el = document.querySelector(`#modals [data-id="${id}"]`)
  if (el) el.remove()
}

export async function createFromBackgroundProcess (reqId, webContentsId, modalId, opts) {
  var cb = (err, res) => ipcRenderer.send('modal-response', reqId, err, res)

  // look up the page
  var page = pages.getByWebContentsID(webContentsId)
  if (!page) return cb('Page not available')

  // lookup the modal
  var modalFn = modalFns[modalId]
  if (!modalFn) return cb('Modal not available')

  // run the modal
  try {
    var res = await modalFn(page, opts)
    cb(null, res)
  } catch (err) {
    cb(err.toString())
  }
}

export function add (page, { render, onForceClose }) {
  // add the modal
  var modal = {
    render,
    onForceClose
  }
  page.modals.push(modal)
  update(page)

  return true
}

export function remove (page, modal) {
  if (!page || !page.modals) { return } // page no longer exists

  // find and remove
  var i = page.modals.indexOf(modal)
  if (i !== -1) {
    page.modals.splice(i, 1)
    update(page)
  }
}

export function forceRemoveAll (page) {
  if (!page || !page.modals) { return } // page no longer exists

  // find and remove
  page.modals.forEach(p => {
    if (typeof p.onForceClose == 'function') { p.onForceClose() }
  })
  page.modals = []
  update(page)
}

export function update (page) {
  // fetch current page, if not given
  page = page || pages.getActive()
  if (!page.webviewEl) return

  // render
  yo.update(page.modalEl, render(page.id, page))
}

// internal methods
// =

function render (id, page) {
  if (!page) { return yo`<div data-id=${id} class="hidden"></div>` }

  return yo`<div data-id=${id} class=${page.isActive ? '' : 'hidden'}>
    ${page.modals.map(modal => {
      return yo`<div class="modal">
        ${modal.render({
          rerender: () => update(page),
          remove: () => remove(page, modal)
        })}
      </div>`
    })}
  </div>`
}

function onGlobalKeydown (e) {
  if (e.key === 'Escape') {
    // close any active modals
    forceRemoveAll(pages.getActive())
  }
}