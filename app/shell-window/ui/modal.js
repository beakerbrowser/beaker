import {ipcRenderer} from 'electron'
import yo from 'yo-yo'
import * as pages from '../pages'
import ModalClasses from './modals/index'

// globals
// =

var modalsDiv

// exported functions
// =

export function setup () {
  modalsDiv = document.querySelector('#modals')
  document.body.addEventListener('keydown', onGlobalKeydown)
}

export function createContainer (id) {
  // render
  var el = render(id, null)
  modalsDiv.append(el)
  return el
}

export function destroyContainer (id) {
  var el = document.querySelector(`#modals .modal-container[data-id="${id}"]`)
  if (el) el.remove()
}

export async function createFromBackgroundProcess (reqId, webContentsId, modalId, opts) {
  var cb = (err, res) => ipcRenderer.send('modal-response', reqId, err && err.message ? err.message : err, res)

  // look up the page
  var page = pages.getByWebContentsID(webContentsId)
  if (!page) return cb('Page not available')

  // lookup the modal
  var ModalClass = ModalClasses[modalId]
  if (!ModalClass) return cb('Modal not available')

  // run the modal
  var modalInst = new (ModalClass)(opts)
  modalInst.on('close', cb)
  add(page, modalInst)
}

export function add (page, modalInst) {
  // add the modal
  page.modals.push(modalInst)
  update(page)

  // wire up events
  modalInst.on('rerender', () => update(page))
  modalInst.on('close', () => remove(page, modalInst))

  return true
}

export function remove (page, modalInst) {
  if (!page || !page.modals) { return } // page no longer exists

  // find and remove
  var i = page.modals.indexOf(modalInst)
  if (i !== -1) {
    page.modals.splice(i, 1)
    update(page)
    if (page.webviewEl) {
      // return focus to the page content
      page.webviewEl.focus()
    }
  }
}

export function forceRemoveAll (page) {
  if (!page || !page.modals) { return } // page no longer exists

  // find and remove
  page.modals.forEach(m => {
    m.close(new Error('Closed'))
  })
  if (page.modals.length && page.webviewEl) {
    // return focus to the page content
    page.webviewEl.focus()
  }
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
  if (!page) { return yo`<div data-id=${id} class="modal-container hidden"></div>` }

  return yo`<div data-id=${id} class="modal-container ${page.isActive ? '' : 'hidden'}">
    ${page.modals.map(modal => yo`<div class="modal">${modal.render()}</div>`)}
  </div>`
}

function onGlobalKeydown (e) {
  if (e.key === 'Escape') {
    // close any active modals
    forceRemoveAll(pages.getActive())
  }
}