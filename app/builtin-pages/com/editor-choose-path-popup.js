import yo from 'yo-yo'

var selectedPath
var actionType
var currentPromise

// exported api
// =

export function render (archive) {
  var title = 'Save as'
  var actLabel = 'Save'
  var placeholder = 'Filename'
  if (actionType === 'create-folder') {
    title = 'New folder'
    actLabel = 'Create'
    placeholder = 'Foldername'
  } else if (actionType === 'import-files') {
    title = 'Destination'
    actLabel = 'Import'
  } else if (actionType === 'rename') {
    title = 'Rename to'
    actLabel = 'Rename'
    placeholder = 'New name'
  }

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

// rendering
// =

function rFolder (archive, node, depth=0) {
  let children = ''
  const padding = 10 + (depth * 10)
  const cls = isSelected(node) ? 'selected' : ''

  if (!node.entry.isDirectory()) {
    return
  }

  if (node.children) {
    children = yo`
      <div class="subtree">
        ${Object.keys(node.children)
          .map(key => node.children[key])
          .sort(treeSorter)
          .map(node => rFolder(archive, node, depth + 1))}
      </div>
    `
  }

  return yo`
    <div>
      <div
        class="item folder ${cls}"
        title=${node.niceName || archive.niceName}
        onclick=${e => onClickDirectory(e, archive, node)}
        style=${'padding-left: ' + padding + 'px'}>
        <i class="fa fa-folder-o"></i>
        ${node.niceName || archive.niceName}
      </div>
      ${children}
    </div>
  `
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

// helpers
// =

function treeSorter (a, b) {
  // by name
  return normalizePath(a.entry.name).localeCompare(normalizePath(b.entry.name))
}

function normalizePath (path) {
  if (path.startsWith('/')) path = path.slice(1)
  if (path.endsWith('/')) path = path.slice(0, -1)
  return path
}

function isSelected (node) {
  console.log(node, selectedPath)
  return (selectedPath === normalizePath(node.entry.name))
}