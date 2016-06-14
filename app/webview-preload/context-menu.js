import { remote, ipcRenderer } from 'electron'

export function setup () {
  window.addEventListener('contextmenu', onContextMenu, false)
}

function onContextMenu (e) {
  // weirdness warning:
  // if you put the following line outside of the function definition,
  // electron will fail to page transition.
  // i think this is because the references are captured in the closure, 
  // and the event handler is not removed, so there are hanging memory
  // references that stop the transition from proceeding.
  // -prf
  const { Menu, MenuItem, clipboard } = remote

  var menuItems = []

  // find href or img data
  var href, img
  var el = document.elementFromPoint(e.clientX, e.clientY)
  while (el && el.tagName) {
    if (!img && el.tagName == 'IMG')
      img = el.src
    if (!href && el.href)
      href = el.href
    el = el.parentNode
  }

  // links
  if (href) {
    menuItems.push({ label: 'Open Link in New Tab', click: () => ipcRenderer.sendToHost('new-tab', href) })
    menuItems.push({ label: 'Copy Link Address', click: () => clipboard.writeText(href) })
    menuItems.push({ type: 'separator' })
  }

  // images
  if (img) {
    menuItems.push({ label: 'Save Image As...', click: () => alert('todo') })
    menuItems.push({ label: 'Copy Image URL', click: () => clipboard.writeText(img) })
    menuItems.push({ label: 'Open Image in New Tab', click: () => ipcRenderer.sendToHost('new-tab', img) })
    menuItems.push({ type: 'separator' })
  }

  // clipboard
  if (e.target.nodeName == 'TEXTREA' || e.target.nodeName == 'INPUT') {
    menuItems.push({ label: 'Cut', click: () => document.execCommand('cut') })
    menuItems.push({ label: 'Copy', click: () => document.execCommand('copy') })
    menuItems.push({ label: 'Paste', click: () => document.execCommand('paste') })
    menuItems.push({ type: 'separator' })
  }
  else if (window.getSelection().toString() !== '') {
    menuItems.push({ label: 'Copy', click: () => document.execCommand('copy') })
    menuItems.push({ type: 'separator' })      
  }

  // inspector
  menuItems.push({ label: 'Inspect Element', click: () => ipcRenderer.sendToHost('inspect-element', e.clientX, e.clientY) })
  if (window.location.protocol == 'dat:') {
    menuItems.push({ label: 'View Dat Archive', click: () => {
      // extract the hostname
      // pathname is in form: '//{host}/{path..}'
      var parts = window.location.pathname.slice(2).split('/')
      if (parts && parts[0])
        window.location = 'view-dat://'+parts[0]+'/'
    }})
  }

  // show menu
  var menu = Menu.buildFromTemplate(menuItems)
  menu.popup(remote.getCurrentWindow())
}