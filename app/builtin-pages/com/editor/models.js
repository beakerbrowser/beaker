/* globals Event monaco diffEditor editor */
import yo from 'yo-yo'
import {renderGeneralHelp} from './general-help'

// globals
// =

var models = []
var modelHistory = []
var active

// exported api
// =

export async function load (file) {
  try {
    var isEditable = canEditWithMonaco(file.name)
    if (isEditable) {
      // load the file content
      await file.readData({ignoreCache: true})
    }

    // setup the model
    let model = monaco.editor.createModel(file.preview, null, monaco.Uri.parse(file.url))
    model.name = file.name
    model.isEditable = isEditable
    model.lastSavedVersionId = model.getAlternativeVersionId()
    Object.defineProperty(model, 'isActive', {get: () => active === model})
    Object.defineProperty(model, 'isDirty', {get: () => model.getAlternativeVersionId() !== model.lastSavedVersionId})
    model.lang = model.getModeId()
    model.onDidChangeContent(e => onDidChange(model))

    models.push(model)
  } catch (e) {
    console.error(e)
    throw e
  }
}

export async function reload (file) {
  var model = findModel(file)
  if (!model) {
    model = await load(file)
  } else {
    // load the file content
    await file.readData({ignoreCache: true})

    // update the content
    model.setValue(file.preview)
    model.lastSavedVersionId = model.getAlternativeVersionId()
    onDidChange(model)
  }
}

export async function unload (file) {
  // if unloaded file is currently active
  // set previously active file to currently active
  // otherwise just remove it from the model history
  let newActive = null
  modelHistory = modelHistory.filter(v => v.name !== file.name)

  if (getActive() === file) newActive = modelHistory.pop()

  if (file.type === 'image') {
    let model = findModel(file)
    models.splice(models.findIndex(v => v.name === model.name), 1)
    document.getElementById('imageViewer').classList.add('hidden')
  } else {
    let model = monaco.editor.getModel(file.uri)
    models.splice(models.findIndex(v => v.name === model.name), 1)
    model.dispose()
  }

  if (newActive) setActive(newActive)
  if (models.length === 0) {
    emit('editor-all-models-closed')
    active = null
  }
  emit('editor-rerender')
}

export async function setActive (file) {
  try {
    // load if not yet loaded
    var model = findModel(file)
    if (!model) {
      model = await load(file)
    }

    // render according to editability
    if (canEditWithMonaco(file.name)) {
      await setEditableActive(file, model)
    } else {
      await setUneditableActive(file, model)
    }

    emit('editor-rerender')
  } catch (e) {
    console.error(e)
    throw e
  }
}

export function setActiveGeneralHelp (archiveInfo, readmeMd) {
  setVisibleRegion('generic-viewer')

  // set no active model
  active = null

  // render the interface
  var viewerEl = document.getElementById('genericViewer')
  yo.update(viewerEl, yo`<div id="genericViewer">${renderGeneralHelp(archiveInfo, readmeMd)}</div>`)

  emit('editor-rerender')
}


export function setActiveDiff (leftContent, rightContent) {
  try {
    setVisibleRegion('diff-editor')

    diffEditor.setModel({
      original: monaco.editor.createModel(leftContent),
      modified: monaco.editor.createModel(rightContent)
    })
    diffEditor.focus()
    emit('editor-rerender')
  } catch (e) {
    console.error(e)
    throw e
  }
}

export function setActiveDeletedFilediff (filediff) {
  setVisibleRegion('generic-viewer')

  // set no active model
  active = null

  // render the 'deleted file' interface
  var viewerEl = document.getElementById('genericViewer')
  yo.update(viewerEl, yo`
    <div id="genericViewer">
      <div class="deleted-filediff">
        <p class="path"><span class="revision-indicator del"></span> ${filediff.path}</p>
        <p>This file was deleted from the preview.</p>
        <p>
          <button class="btn" onclick=${e => emit('editor-commit-file', {path: filediff.path})}><i class="fas fa-check"></i> Commit</button>
          <button class="btn" onclick=${e => emit('editor-revert-file', {path: filediff.path})}><i class="fa fa-undo"></i> Revert</button>
        </p>
      </div>
    </div>`
  )

  emit('editor-rerender')
}

export function exitDiff () {
  setVisibleRegion('editor')
}

export async function unloadOthers (model) {
  let modelsRef = models.filter(v => {
    if (v.id !== model.id) return true
  })

  for (let model of modelsRef) {
    await unload(model)
  }
  emit('editor-rerender')
}

export async function unloadAllModels () {
  let modelsRef = models.slice()
  for (let model of modelsRef) {
    await unload(model)
  }
  modelHistory = []
  emit('editor-rerender')
}

export function reorderModels (from, to) {
  let fromIndex = models.indexOf(from)
  let toIndex = to === null ? models.length : models.indexOf(to)
  models.splice(toIndex, 0, models.splice(fromIndex, 1)[0])
}

export function findModel (file) {
  var path = file._path || file.uri.path // file-node or model
  return models.find(model => model.uri.path === path)
}

export function getActive () {
  return active
}

export function getModels () {
  return models
}

export function setVersionIdOnSave (model) {
  model.lastSavedVersionId = model.getAlternativeVersionId()
  emit('editor-model-cleaned', {model})
}

export function checkForDirtyFiles () {
  return !!models.find(m => m.isDirty)
}

export function isShowingDiff () {
  return diffEditor._domElement.hidden !== true
}

// internal methods
// =

function emit (name, detail = null) {
  document.dispatchEvent(new CustomEvent(name, {detail}))
}

function setVisibleRegion (name) {
  editor.domElement.hidden = name === 'editor' ? false : true
  diffEditor._domElement.hidden = name === 'diff-editor' ? false : true
  if (name === 'image-viewer') {
    document.getElementById('imageViewer').classList.remove('hidden')
  } else {
    document.getElementById('imageViewer').classList.add('hidden')
  }
  if (name === 'generic-viewer') {
    document.getElementById('genericViewer').classList.remove('hidden')
  } else {
    document.getElementById('genericViewer').classList.add('hidden')
  }
}

function canEditWithMonaco (name) {
  // no extension?
  if (name.split('/').pop().indexOf('.') === -1) {
    return true // assume plaintext
  }

  // support ignore files
  if (name === '.gitignore' || name === '.datignore') return true

  // do we have this language?
  const l = monaco.languages.getLanguages()
  for (var i=0; i < l.length; i++) {
    for (var j=0; j < l[i].extensions.length; j++) {
      if (name.endsWith(l[i].extensions[j])) {
        return true
      }
    }
  }
  return false
}

async function setEditableActive (file, model) {
  setVisibleRegion('editor')

  // before changing active, get viewstate of currently active file
  if (active) active.viewState = editor.saveViewState()

  active = findModel(file)
  editor.setModel(findModel(file))

  // if model has a view state, get that viewstate and apply it
  if (active.viewState) editor.restoreViewState(active.viewState)

  // after everything is set bring focus to editor
  editor.focus()

  modelHistory.push(file)
}

async function setUneditableActive (file, model) {
  const url = file.url || file.uri.toString()

  active = findModel(file)
  modelHistory.push(file)

  if (/(png|jpg|jpeg|gif|ico)$/.test(url)) {
    setVisibleRegion('image-viewer')
    let container = document.getElementById('imageViewer')
    container.innerHTML = ''
    let img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    img.onload = () => {
      container.append(img)
      container.classList.remove('hidden')
    }
  } else {
    setVisibleRegion('generic-viewer')
    var viewerEl = document.getElementById('genericViewer')
    yo.update(viewerEl, yo`<div id="genericViewer"><div class="opaque-binary">
<code>1010100111001100
1110100101110100
1001010100010111</code>
        </div></div>`
    )
  }
}

function onDidChange (model) {
  if (model.lastSavedVersionId !== model.getAlternativeVersionId()) {
    emit('editor-model-dirtied', {model})
  } else {
    emit('editor-model-cleaned', {model})
  }
}
