import yo from 'yo-yo'
import mime from 'mime'
import {Archive, FileTree} from 'builtin-pages-lib'
import rFiles from './com/editor-files'

const models = {} // all in-memory models
var archive = null

setup()
async function setup () {
  try {
    // load the archive
    var datHostname = window.location.pathname.split('/')[1]
    var datKey = await DatArchive.resolveName(datHostname)
    console.log('Loading', datKey)
    archive = new Archive(datKey)
    archive.dirtyFiles = {} // which files have been modified?
    archive.activeModel = null // what file are we viewing?
    archive.fileTree = new FileTree(archive)
    await archive.setup('/')
    await archive.fileTree.setup()
    archive.addEventListener('changed', onArchiveChanged)
    renderNav()

    // debug
    window.models = models
    window.archive = archive
  } catch (e) {
    console.error('Failed to load', e)
  }
}

// rendering
// =

function renderNav () {
  // nav
  yo.update(
    document.querySelector('.editor-nav'),
    yo`<div class="editor-nav">
      <div class="sitetitle">${archive.info.title}</div>
      ${rFiles(archive)}
    </div>`
  )
  // header
  const activeModel = archive.activeModel
  const isChanged = (activeModel && archive.dirtyFiles[activeModel.path]) ? '*' : ''
  yo.update(
    document.querySelector('.header'),
    yo`<div class="header">
      <div class="btn" onclick=${save}><span class="fa fa-floppy"></span> Save</div>
      <div class="file-info">
        ${activeModel ? activeModel.path : ''}${isChanged}
        ${activeModel
          ? yo`<span class="muted thin">${activeModel.lang}</span>`
          : ''}
      </div>
      <div class="flex-fill"></div>
      <div class="btn" onclick=${onFork}><span class="fa fa-code-branch"></span> Fork</div>
      <div class="btn" onclick=${onOpenInNewWindow}><span class="fa fa-popup"></span> Open</div>
    </div>`
  )
}

// event handlers
// =

window.addEventListener('editor-created', () => {
  setActive('index.html')
})

window.addEventListener('open-file', e => {
  setActive(e.detail.path)
})

window.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.keyCode === 83/*'S'*/) {
    e.preventDefault()
    save()
  }
})

function onFork () {
  console.log(archive.url)
  DatArchive.fork(archive.url)
}

function onOpenInNewWindow () {
  var path = archive.activeModel ? archive.activeModel.path : ''
  beakerBrowser.openUrl(`${archive.url}/${path}`)
}

function onArchiveChanged () {
  if (!archive.activeModel) return
  // TODO
  // archive.files.setCurrentNodeByPath(activeModel.path, {allowFiles: true})
  renderNav()
}

function onDidChangeContent (path) {
  return e => {
    if (archive.dirtyFiles[path]) {
      return
    }

    // update state and render
    archive.dirtyFiles[path] = true
    renderNav()
  }
}

// internal methods
// =

async function load (path) {
  try {
    // load the file content
    path = normalizePath(path)
    const url = archive.url + '/' + path
    const str = await archive.readFile(path, 'utf8')

    // setup the model
    models[path] = monaco.editor.createModel(str, null, monaco.Uri.parse(url))
    models[path].path = path
    models[path].isEditable = true
    models[path].lang = models[path].getModeId()
    models[path].onDidChangeContent(onDidChangeContent(path))
  } catch (e) {
    console.error(e)
    throw e
  }
}

async function save () {
  const activeModel = archive.activeModel
  try {
    if (!activeModel || !archive.dirtyFiles[activeModel.path]) {
      return
    }

    // write the file content
    await archive.writeFile(activeModel.path, activeModel.getValue(), 'utf-8')

    // update state and render
    archive.dirtyFiles[activeModel.path] = false
    renderNav()
  } catch (e) {
    console.log(activeModel.path, models, models[activeModel.path])
    console.error(e)
    throw e
  }
}

async function setActive (path) {
  try {
    path = normalizePath(path)

    // load according to editability
    const isEditable = checkIfIsEditable(path)
    if (isEditable) {
      await setEditableActive(path)
    } else {
      await setUneditableActive(path)
    }

    // set active
    archive.activeModel = models[path]
    renderNav()
  } catch (e) {
    console.error(e)
    throw e
  }
}

function normalizePath (path) {
  if (path.startsWith('/')) return path.slice(1)
  return path
}

function checkIfIsEditable (path) {
  // no extension?
  if (path.split('/').pop().indexOf('.') === -1) {
    return true // assume plaintext
  }
  // do we have this language?
  const l = monaco.languages.getLanguages()
  for (var i=0; i < l.length; i++) {
    for (var j=0; j < l[i].extensions.length; j++) {
      if (path.endsWith(l[i].extensions[j])) {
        return true
      }
    }
  }
  // lookup the mimetype
  var mimetype = mime.lookup(path)
  // text or application?
  if (mimetype.startsWith('text/') || mimetype.startsWith('application/')) {
    return true
  }
  // svg?
  if (mimetype === 'image/svg+xml') {
    return true
  }
  return false
}

async function setEditableActive (path) {
  // load if not yet loaded
  if (!(path in models)) {
    await load(path)
  }
  editor.setModel(models[path])
  document.getElementById('uneditable-container').classList.add('hidden')
  document.getElementById('editable-container').classList.remove('hidden')
}

async function setUneditableActive (path) {
  // lookup the mimetype
  var mimetype = mime.lookup(path)

  // set the entry info
  models[path] = {path, isEditable: false, lang: ''}
  document.getElementById('editable-container').classList.add('hidden')
  if (mimetype.startsWith('image/')) {
    yo.update(document.getElementById('uneditable-container'), yo`
      <div id="uneditable-container">
        <img src=${archive.url + '/' + path} />
      </div>
    `)
  } else if (mimetype.startsWith('video/')) {
    yo.update(document.getElementById('uneditable-container'), yo`
      <div id="uneditable-container">
        <video controls width="400" src=${archive.url + '/' + path}></video>
      </div>
    `)
  } else if (mimetype.startsWith('audio/')) {
    yo.update(document.getElementById('uneditable-container'), yo`
      <div id="uneditable-container">
        <audio controls width="400" src=${archive.url + '/' + path}></audio>
      </div>
    `)
  } else {
    yo.update(document.getElementById('uneditable-container'), yo`
      <div id="uneditable-container">
        Unsupported filetype, ${mimetype}
      </div>
    `)
  }
}