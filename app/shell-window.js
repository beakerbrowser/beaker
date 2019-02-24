import { ipcRenderer } from 'electron'
import './new-shell-window/ui'
// import * as pages from './shell-window/pages'
// import * as navbar from './shell-window/ui/navbar'
// import { setup as setupUI } from './shell-window/ui'

// attach some window globals
// window.pages = pages
// window.navbar = navbar

// setup
document.addEventListener('DOMContentLoaded', () => {
  // setupUI(() => {
    ipcRenderer.send('shell-window:ready')
  // })
})
