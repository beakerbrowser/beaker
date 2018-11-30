/* globals Event monaco editor */

// globals
// =

var models = []

// exported api
// =

export const load = async function load (file) {
  try {
    // load the file content
    await file.readData()

    // setup the model
    let model = monaco.editor.createModel(file.preview, null, monaco.Uri.parse(file.url))
    model.name = file.name
    model.isEditable = true
    model.lang = model.getModeId()

    models.push(model)
  } catch (e) {
    console.error(e)
    throw e
  }
}

export function unload (e, file) {
  e.stopPropagation()
  // TODO
  // if unloaded file is currently active
  // set previously active file to currently active
  let model = monaco.editor.getModel(file.uri)
  models.splice(models.findIndex(v => v.name === model.name), 1)
  model.dispose()

  window.dispatchEvent(new Event('update-editor'))
}

export const save = async function save (archive, path) {

}

export const setActive = async function setActive (file) {
  try {
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

export const findModel = function findModel (fileName) {
  return models.find(v => v.name === fileName)
}

export function getActive () {
  return editor.getModel()
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

const setEditableActive = async function setEditableActive (file) {
  // load if not yet loaded
  if (!findModel(file.name)) {
    await load(file)
  }
  document.querySelector('#diffEditor').style.display = 'none'
  document.querySelector('#editor').style.display = 'block'
  editor.setModel(findModel(file.name))
}

const setUneditableActive = async function (file) {
  // TODO
}