import yo from 'yo-yo'

var prompt
var currentPromise

// exported api
// =

export function render (archive) {
  return yo`
    <div id="choose-path-popup" class="active">
      <form class="choose-path-form ${actionType}" onsubmit=${onSubmitChoosePath}>
        <div class="filename">
          <label for="name">${title}</label>
          <input autofocus type="text" name="name" placeholder=${placeholder} tabindex="1" />
        </div>
        <div class="folder-select">
          ${rFolder(archive, archive.fileTree.rootNode)}
        </div>
        <div class="actions">
          <button class="btn" type="button" onclick=${onCancel} tabindex="2">Cancel</button>
          <button class="btn primary" type="submit" tabindex="3">${actLabel}</button>
        </div>
      </form>
    </div>
  `
}

export function create (archive, {path, action, value} = {}) {
  return new Promise((resolve, reject) => {
    // reset state
    selectedPath = path || ''
    actionType = action || 'save-file'

    // render interface
    yo.update(document.getElementById('choose-path-popup'), render(archive))

    // select input
    var input = document.querySelector('#choose-path-popup input')
    input.value = value || ''
    input.focus()
    input.select()

    // store resolve, reject
    currentPromise = {resolve, reject}
  })
}

export function destroy () {
  var popup = document.getElementById('choose-path-popup')
  popup.innerHTML = ''
  popup.classList.remove('active')
}

// event handlers
// =

function onClickDirectory (e, archive, node) {
  selectedPath = normalizePath(node.entry.name)
  yo.update(document.querySelector('#choose-path-popup .folder-select > div'), rFolder(archive, archive.fileTree.rootNode))
}

function onSubmitChoosePath (e) {
  e.preventDefault()

  // get path
  var name = document.querySelector('#choose-path-popup input').value
  var path = name
  if (selectedPath) {
    path = normalizePath(selectedPath) + '/' + path
  }

  // invalid paths
  if (path.endsWith('/')) {
    alert('Files can not end with a /')
    return
  }

  destroy()

  var evt = new Event('choose-path')
  evt.detail = {path, action: actionType}
  window.dispatchEvent(evt)
  currentPromise.resolve(path)
  currentPromise = null
}

function onCancel (e) {
  e.preventDefault()
  destroy()
  currentPromise.reject()
  currentPromise = null
}