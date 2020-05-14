import yo from 'yo-yo'
import * as toast from './toast'
import {writeToClipboard} from '../../lib/event-handlers'

// exported api
// =

export function render (url) {
  return yo`
    <div id="share-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <div class="popup-inner">
        <div class="head">
          <span class="title">Share this site</span>
          <button class="btn" onclick=${onCopyURL(url)}><i class="fa fa-clipboard"></i> Copy link</button>
        </div>
        <div><input value=${url} /></div>
        <div class="info"><i class="fa fa-lock"></i> Only people with this link can see your files.</div>
      </div>
    </div>
  `
}

export function create (url) {
  // render interface
  var popup = render(url)
  document.body.appendChild(popup)
  document.addEventListener('keyup', onKeyUp)

  // select input
  var input = popup.querySelector('input')
  input.focus()
  input.select()
}

export function destroy () {
  var popup = document.getElementById('share-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
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

function onClickWrapper (e) {
  if (e.target.id === 'share-popup') {
    destroy()
  }
}

function onCopyURL (url) {
  return e => {
    writeToClipboard(encodeURI(url))
    toast.create(`URL copied to clipboard`)
  }
}
