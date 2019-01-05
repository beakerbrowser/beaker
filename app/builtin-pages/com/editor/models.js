/* globals Event monaco diffEditor editor */

// globals
// =

var models = []
var modelHistory = []
var active

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
    model.lang = model.getModeId()
    // TODO
    // model.onDidChangeContent(onDidChange(file))

    models.push(model)
  } catch (e) {
    console.error(e)
    throw e
  }
}

export function unload (e, file) {
  e.stopPropagation()

  // if unloaded file is currently active
  // set previously active file to currently active
  // otherwise just remove it from the model history
  let newActive = null
  modelHistory = modelHistory.filter(v => v.name !== file.name)

  if (getActive() === file) newActive = modelHistory.pop()

  // handle diff
  if (file.diff) {
    let model = findModel(file.name)
    models.splice(models.findIndex(v => v.name === model.name), 1)
    model.original.dispose()
    model.modified.dispose()
  } else {
    let model = monaco.editor.getModel(file.uri)
    models.splice(models.findIndex(v => v.name === model.name), 1)
    model.dispose()
  }

  if (newActive) setActive(newActive)
  window.dispatchEvent(new Event('update-editor'))
}

export const setActive = async function setActive (file) {
  try {
    // this is a diff
    if (file.change || file.diff) {
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

    window.dispatchEvent(new Event('update-editor'))
  } catch (e) {
    console.error(e)
    throw e
  }
}

export const setActiveDiff = async function setActiveDiff (diff) {
  try {
    editor.domElement.hidden = true

    // load if not yet loaded
    if (!findModel(diff.name)) {
      diffEditor.setModel({
        original: monaco.editor.createModel(diff.original),
        modified: monaco.editor.createModel(diff.modified)
      })

      // create diff model for tabs
      let diffModel = diffEditor.getModel()
      diffModel.name = diff.name
      diffModel.diff = diff

      models.push(diffModel)
    }

    let model = findModel(diff.name)
    diffEditor.setModel({
      original: model.original,
      modified: model.modified
    })

    modelHistory.push(diff)
    active = findModel(diff.name)
    window.dispatchEvent(new Event('update-editor'))
  } catch (e) {
    console.error(e)
    throw e
  }
}

export const findModel = function findModel (fileName) {
  return models.find(v => v.name === fileName)
}

export function getActive () {
  return active
}

export function getModels () {
  return models
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
  active = findModel(file.name)
  editor.setModel(findModel(file.name))
  modelHistory.push(file)
}

const setUneditableActive = async function (file) {
  // TODO
}

function onDidChange (file) {
  return e => {
    console.log(file)
  }
}
