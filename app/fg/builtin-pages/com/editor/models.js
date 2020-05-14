/* globals Event monaco diffEditor editor */
import yo from 'yo-yo'
import {renderHome} from './home'

// globals
// =

var models = []
var modelHistory = []
var active
var numUntitled = 0

// exported api
// =

export function createModel (content, url) {
  var model = monaco.editor.createModel(content, null, url ? monaco.Uri.parse(url) : undefined)
  model.updateOptions({tabSize: 2})
  model.name = ''
  model.isEditable = true
  model.lang = ''
  model.lastSavedVersionId = model.getAlternativeVersionId()
  Object.defineProperty(model, 'isActive', {get: () => active === model})
  Object.defineProperty(model, 'isDiffing', {get: () => active === model && isShowingDiff()})
  Object.defineProperty(model, 'isDirty', {get: () => model.getAlternativeVersionId() !== model.lastSavedVersionId})
  model.onDidChangeContent(e => onDidChange(model))
  models.push(model)
  return model
}

export function createNewModel () {
  let model = createModel()
  model.name = `Untitled-${++numUntitled}`
  model.isEditable = true
  model.lang = ''
  model.isNewModel = true
  return model
}

export async function load (file) {
  try {
    // setup the model
    let model = createModel('', file.url)
    model.name = file.name
    model.isEditable = canEditWithMonaco(file.name)
    model.lang = model.getModeId()
    model.isNewModel = false

    if (model.isEditable) {
      // load the file content
      doLoad(model, file)
    }

    return model
  } catch (e) {
    console.error(e)
    throw e
  }
}

export async function reload (file) {
  var model = findModel(file)
  if (!model) {
    model = load(file)
  } else {
    doLoad(model, file)
  }
}

async function doLoad (model, file) {
  // start load
  model.loadError = null
  model.isLoading = true
  try {
    await file.readData({ignoreCache: true, timeout: 15e3})
    model.isLoading = false
    model.setValue(file.fileData)
    model.lastSavedVersionId = model.getAlternativeVersionId()
    onDidChange(model)
  } catch (err) {
    if (err.name === 'TimeoutError') {
      model.loadError = 'Unable to find the file on the network. Make sure the site is online and your connection is working.'
    } else {
      model.loadError = err
    }
  }

  // rerender if still active
  if (model.isActive) {
    await setActive(file)
    editor.setScrollTop(0)
  }
}

export async function unload (file) {
  if (file.isDirty && !confirm(`Close ${file.name} without saving changes?`)) {
    return
  }

  // if unloaded file is currently active
  // set previously active file to currently active
  // otherwise just remove it from the model history
  let newActive = null
  modelHistory = modelHistory.filter(v => v.name !== file.name)

  if (getActive() === file) newActive = modelHistory.pop()

  let model = monaco.editor.getModel(file.uri)
  models.splice(models.findIndex(v => v.name === model.name), 1)
  model.dispose()

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

    // render according to editability and state
    if (model.loadError) {
      await setLoadErrorActive(file, model)
    } else if (model.isLoading) {
      await setLoadingActive(file, model)
    } else if (canEditWithMonaco(file.name)) {
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

export function setActiveHome (opts) {
  setVisibleRegion('generic-viewer')

  // set no active model
  active = null

  // render the interface
  var viewerEl = document.getElementById('genericViewer')
  yo.update(viewerEl, yo`<div id="genericViewer">${renderHome(opts)}</div>`)

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

export function findModel (fileOrNode) {
  var path = fileOrNode._path || fileOrNode.uri.path
  if (path) {
    return models.find(model => model.uri.path === path)
  }
  if (fileOrNode.id) {
    return models.find(model => model.id === fileOrNode.id)
  }
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

async function setLoadErrorActive (file, model) {
  setVisibleRegion('generic-viewer')
  active = model
  var viewerEl = document.getElementById('genericViewer')
  yo.update(viewerEl, yo`
    <div id="genericViewer">
      <div class="error-notice">
        <span class="fas fa-exclamation-triangle"></span>
        ${model.loadError.toString()}
      </div>
    </div>
  `)
}

async function setLoadingActive (file, model) {
  setVisibleRegion('generic-viewer')
  active = model
  var viewerEl = document.getElementById('genericViewer')
  yo.update(viewerEl, yo`
    <div id="genericViewer">
      <div class="loading-notice"><span class="spinner"></span> Loading...</div>
    </div>
  `)
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
