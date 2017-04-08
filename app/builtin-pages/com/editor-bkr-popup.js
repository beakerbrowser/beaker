import yo from 'yo-yo'

// exported api
// =

export function render (archive) {
  return yo`
    <div id="editor-bkr-popup" class="active" onclick=${onClickWrapper}>
      <div class="popup-inner">
        <div class="head">
          <span class="title">Manage files with <code class="inline">bkr</code></span>
        </div>
        <p>
          Clone this project with <code class="inline">bkr</code> to edit its files locally. <a href="https://github.com/beakerbrowser/bkr">Learn more</a>.
        </p>
        <code class="copypasta">bkr clone ${archive.url}</code>
      </div>
    </div>
  `
}

export function create (archive) {
  // render interface
  var popup = render(archive)
  document.body.appendChild(popup)
}

export function destroy () {
  var popup = document.getElementById('editor-bkr-popup')
  document.body.removeChild(popup)
}

// event handlers
// =

function onClickWrapper (e) {
  if (e.target.id === 'editor-bkr-popup') {
    destroy()
  }
}

function onClose (e) {
  e.preventDefault()
  destroy()
}
