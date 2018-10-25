/* globals Event monaco editor */

const yo = require('yo-yo')

// globals
// =

var models = {}
var active

// exported api
// =

export const load = async function load (archive, file) {
  try {
    console.log(file)

    // load the file content
    await file.readData()
    console.log(file)

    // setup the model
    models[file.name] = monaco.editor.createModel(file.preview, null, monaco.Uri.parse(file.url))
    models[file.name].name = file.name
    models[file.name].isEditable = true
    models[file.name].lang = models[file.name].getModeId()
    models[file.name].onDidChangeContent(onDidChange(archive, file))
  } catch (e) {
    console.error(e)
    throw e
  }
}

export const save = async function save (archive, path) {

}

export const setActive = async function setActive (archive, file) {
  try {
    console.log(file)
    // load according to editability
    let canEdit = canEditWithMonaco(file.name)
    if (canEdit) {
      await setEditableActive(archive, file)
    } else {
      await setUneditableActive(archive, file)
    }

    // set active
    active = models[file.name]
    window.dispatchEvent(new Event('set-active-model'))
  } catch (e) {
    console.error(e)
    throw e
  }
}

export function getActive () {
  return active
}

export function getModels () {
  return models
}

// internal methods
// =

function onDidChange (archive, path) {
  return e => {
    console.log(e, path)
  }
}

function normalizePath (path) {
  if (path.startsWith('/')) return path.slice(1)
  return path
}

function getUrl (archive, path) {
  return `dat://${archive.info.key}/${path}`
}

function canEditWithMonaco (name) {
  // no extension?
  if (name.split('/').pop().indexOf('.') === -1) {
    return true // assume plaintext
  }
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

const setEditableActive = async function setEditableActive (archive, file) {
  // load if not yet loaded
  if (!(file.name in models)) {
    await load(archive, file)
  }
  editor.setModel(models[file.name])
}

const setUneditableActive = async function (archive, path) {
  // set the entry info
  models[path] = {
    path,
    isEditable: false,
    lang: ''
  }
}