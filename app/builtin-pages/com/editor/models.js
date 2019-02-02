/* globals Event monaco diffEditor editor */

// globals
// =

var models = []
var modelHistory = []
var active

// exported api
// =

export async function load (file) {
  try {
    // load the file content
    await file.readData({ignoreCache: true})

    // setup the model
    let model = monaco.editor.createModel(file.preview, null, monaco.Uri.parse(file.url))
    model.name = file.name
    model.isEditable = true
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

  // handle diff
  if (file.isDiff) {
    let model = findModel(file)
    models.splice(models.findIndex(v => {
      if (v.name === model.name && v.isDiff) return true
    }), 1)
    model.original.dispose()
    model.modified.dispose()
  } else if (file.type === 'image') {
    let model = findModel(file)
    models.splice(models.findIndex(v => v.name === model.name), 1)
    document.getElementById('imageViewer').classList.add('hidden')
  } else {
    let model = monaco.editor.getModel(file.uri)
    models.splice(models.findIndex(v => v.name === model.name), 1)
    model.dispose()
  }

  if (newActive) setActive(newActive)
  emit('editor-rerender')
}

export async function setActive (file) {
  try {
    // this is a diff
    if (file.isDiff) {
      setActiveDiff(file)
      return
    }

    // load according to editability
    let canEdit = canEditWithMonaco(file.name)
    if (canEdit) {
      await setEditableActive(file)
    } else {
      await setUneditableActive(file)
    }

    emit('editor-rerender')
  } catch (e) {
    console.error(e)
    throw e
  }
}

export async function setActiveDiff (leftContent, rightContent) {
  try {
    editor.domElement.hidden = true
    diffEditor._domElement.hidden = false
    document.getElementById('imageViewer').classList.add('hidden')

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

export function exitDiff () {
  editor.domElement.hidden = false
  diffEditor._domElement.hidden = true
  document.getElementById('imageViewer').classList.add('hidden')
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

export function reorderModels(from, to) {
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

export function isShowingDiff () {
  return diffEditor._domElement.hidden !== true
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

// internal methods
// =

function emit (name, detail = null) {
  document.dispatchEvent(new CustomEvent(name, {detail}))
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

async function setEditableActive (file) {
  // load if not yet loaded
  if (!findModel(file)) {
    await load(file)
  }

  editor.domElement.hidden = false
  diffEditor._domElement.hidden = true
  document.getElementById('imageViewer').classList.add('hidden')

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

async function setUneditableActive (file) {
  let model = {}
  editor.domElement.hidden = true
  diffEditor._domElement.hidden = true

  if (!findModel(file)) {
    model.name = file.name
    model.isEditable = file.isEditable
    model.type = 'image'
    model.url = file.url
    models.push(model)
  }

  let container = document.getElementById('imageViewer')
  container.innerHTML = ''
  let img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = file.url
  img.onload = () => {
    container.append(img)
    container.classList.remove('hidden')
  }

  active = findModel(file)
  modelHistory.push(file)
}

function onDidChange (model) {
  if (model.lastSavedVersionId !== model.getAlternativeVersionId()) {
    emit('editor-model-dirtied', {model})
  } else {
    emit('editor-model-cleaned', {model})
  }
}
