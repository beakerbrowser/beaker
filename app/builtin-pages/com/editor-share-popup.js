import yo from 'yo-yo'

// exported api
// =

export function render (archive) {
  return yo`
    <div id="editor-share-popup" class="active" onclick=${onClickWrapper}>
      <div class="popup-inner">
        <div class="head">
          <span class="title">Share this site</span>
          <button class="btn"><i class="fa fa-clipboard"></i> Copy link</button>
        </div>
        <div><input value=${archive.url} /></div>
        <div class="info"><i class="fa fa-lock"></i> Only people with this link can see your files.</div>
      </div>
    </div>
  `
}

export function create (archive) {
  // render interface
  var popup = render(archive)
  document.body.appendChild(popup)

  // select input
  var input = popup.querySelector('input')
  input.focus()
  input.select()
}

export function destroy () {
  var popup = document.getElementById('editor-share-popup')
  document.body.removeChild(popup)
}

// event handlers
// =

function onClickWrapper (e) {
  if (e.target.id === 'editor-share-popup') {
    destroy()
  }
}

function onClose (e) {
  e.preventDefault()
  destroy()
}