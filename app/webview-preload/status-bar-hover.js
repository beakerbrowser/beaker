import { ipcRenderer } from 'electron'

function setStatus (status) {
  ipcRenderer.sendToHost('set-status-bar', status)
}

export function setup () {
  window.addEventListener('mouseover', function (e) {
    // watch for mouseovers of anchor elements
    var el = e.target
    while (el) {
      if (el.tagName == 'A') {
        // set to title or href
        if (el.href)
          setStatus(el.href)
        return 
      }
      el = el.parentNode
    }
    setStatus(false)
  })
}