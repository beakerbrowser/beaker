import {ipcRenderer} from 'electron'
import yo from 'yo-yo'
import * as pages from '../pages'
import SidebarClasses from './sidebars/index'

// globals
// =

var sidebarsDiv

// exported functions
// =

export function setup () {
  sidebarsDiv = document.querySelector('#sidebars')
}

export function createContainer (id) {
  // render
  var el = render(id, null)
  sidebarsDiv.append(el)
  return el
}

export function destroyContainer (id) {
  var el = document.querySelector(`#sidebars .sidebar-container[data-id="${id}"]`)
  if (el) el.remove()
}

export async function onDidNavigate (page) {
  // find a sidebar
  var SidebarClass
  for (let SC of Object.values(SidebarClasses)) {
    if (SC.shouldRender(page)) {
      SidebarClass = SC
      break
    }
  }

  // instantiate
  page.sidebar = SidebarClass ? new SidebarClass(page) : null
  update(page)

  // wire up events
  if (page.sidebar) {
    page.sidebar.on('rerender', () => update(page))
  }
}

export function update (page) {
  // fetch current page, if not given
  page = page || pages.getActive()
  if (!page.webviewEl) return

  // render
  yo.update(page.sidebarEl, render(page.id, page))
}

// internal methods
// =

function render (id, page) {
  if (!page) { return yo`<div data-id=${id} class="sidebar-container hidden"></div>` }
  if (!page.sidebar) { return yo`<div data-id=${id} class="sidebar-container hidden"></div>` }

  return yo`<div data-id=${id} class="sidebar-container ${page.isActive ? '' : 'hidden'}">
    <div class="sidebar">${page.sidebar.render()}</div>
  </div>`
}
