/* globals Event monaco diffEditor editor */

// globals
// =

var models = []
var modelHistory = []
var active
var lastSavedVersionId
var isDirtyFiles = false

// exported api
// =

export const load = async function load (file) {
  try {
    // load the file content
    await file.readData({ignoreCache: true})

    // setup the model
    let model = monaco.editor.createModel(file.preview, null, monaco.Uri.parse(file.url))
    model.name = file.name
    model.isEditable = true
    Object.defineProperty(model, 'isActive', {get: () => active === model})
    model.lang = model.getModeId()
    model.onDidChangeContent(e => onDidChange(e, model))

    lastSavedVersionId = model.getAlternativeVersionId()

    models.push(model)
  } catch (e) {
    console.error(e)
    throw e
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
    let model = findModel(file.name, true)
    models.splice(models.findIndex(v => {
      if (v.name === model.name && v.isDiff) return true
    }), 1)
    model.original.dispose()
    model.modified.dispose()
  } else if (file.type === 'image') {
    let model = findModel(file.name)
    models.splice(models.findIndex(v => v.name === model.name), 1)
    document.getElementById('imageViewer').classList.add('hidden')
  } else {
    let model = monaco.editor.getModel(file.uri)
    models.splice(models.findIndex(v => v.name === model.name), 1)
    model.dispose()
  }

  if (newActive) setActive(newActive)
  document.dispatchEvent(new Event('editor-rerender'))
}

export const setActive = async function setActive (file) {
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

    document.dispatchEvent(new Event('editor-rerender'))
  } catch (e) {
    console.error(e)
    throw e
  }
}

export const setActiveDiff = async function setActiveDiff (diff) {
  try {
    editor.domElement.hidden = true
    document.getElementById('imageViewer').classList.add('hidden')

    // load if not yet loaded
    if (!findModel(diff.name, true)) {
      await diff.readData()
      await diff.original.readData()

      diffEditor.setModel({
        original: monaco.editor.createModel(diff.original.preview),
        modified: monaco.editor.createModel(diff.preview)
      })

      // create diff model for tabs
      let diffModel = diffEditor.getModel()
      diffModel.name = diff.name
      diffModel.diff = diff
      diffModel.isDiff = true

      models.push(diffModel)
    }

    // before changing active, get viewstate of currently active file
  if (active) active.viewState = diffEditor.saveViewState()


    let model = findModel(diff.name, true)
    active = findModel(diff.name, true)
    diffEditor.setModel({
      original: model.original,
      modified: model.modified
    })

    // if model has a view state, get that viewstate and apply it
    if (active.viewState) diffEditor.restoreViewState(active.viewState)

    // after everything is set bring focus to editor
    diffEditor.focus()

    modelHistory.push(diff)
    document.dispatchEvent(new Event('editor-rerender'))
  } catch (e) {
    console.error(e)
    throw e
  }
}

export async function unloadOthers (model) {
  let modelsRef = models.filter(v => {
    if (v.id !== model.id) return true
  })

  for (let model of modelsRef) {
    await unload(model)
  }
  document.dispatchEvent(new Event('editor-rerender'))
}

export async function unloadAllModels () {
  let modelsRef = models.slice()
  for (let model of modelsRef) {
    await unload(model)
  }
  modelHistory = []
  document.dispatchEvent(new Event('editor-rerender'))
}

export function reorderModels(from, to) {
  let fromIndex = models.indexOf(from)
  let toIndex = to === null ? models.length : models.indexOf(to)
  models.splice(toIndex, 0, models.splice(fromIndex, 1)[0])
}

export function findModel (fileName, isDiff = false) {
  let results = models.filter(v => v.name === fileName)
  if (isDiff) return results.find(v => v.isDiff)
  else return results.find(v => {
    if (v.name === fileName && !v.isDiff) return true
  })
}

export function getActive () {
  return active
}

export function getModels () {
  return models
}

export function setVersionIdOnSave (model) {
  lastSavedVersionId = model.getAlternativeVersionId()
  isDirtyFiles = false
}

export function checkForDirtyFiles () {
  return isDirtyFiles
}

// internal methods
// =

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
  if (!findModel(file.name)) {
    await load(file)
  }

  editor.domElement.hidden = false
  document.getElementById('imageViewer').classList.add('hidden')

  // before changing active, get viewstate of currently active file
  if (active) active.viewState = editor.saveViewState()

  active = findModel(file.name)
  editor.setModel(findModel(file.name))

  // if model has a view state, get that viewstate and apply it
  if (active.viewState) editor.restoreViewState(active.viewState)

  // after everything is set bring focus to editor
  editor.focus()

  modelHistory.push(file)
}

// images for now
const setUneditableActive = async function (file) {
  let model = {}
  editor.domElement.hidden = true
  diffEditor._domElement.hidden = true

  if (!findModel(file.name)) {
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

  active = findModel(file.name)
  modelHistory.push(file)
}

function onDidChange (e, model) {
  if (lastSavedVersionId !== model.getAlternativeVersionId()) isDirtyFiles = true
}
