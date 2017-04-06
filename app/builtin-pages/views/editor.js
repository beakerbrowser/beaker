import yo from 'yo-yo'
import mime from 'mime'
import {Archive, FileTree} from 'builtin-pages-lib'
import {render as renderEditorOptions, defaultEditorOptions} from '../com/editor-options'
import {update as updateFilesList} from '../com/editor-files-list'
import {render as renderFileView} from '../com/editor-file-view'
import {update as updateHeader} from '../com/editor-header'
import renderContextMenu from '../com/editor-context-menu'
import * as choosePathPopup from '../com/editor-choose-path-popup'
import {pushUrl} from '../../lib/fg/event-handlers'
import {ucfirst} from '../../lib/strings'
import dragDrop from '../../lib/fg/drag-drop'

// globals
// =

var viewError = null // toplevel error object
var viewIsLoading = false // toplevel, is loading? false, 'archive', or 'file'
var selectedArchiveKey = null // selected archive's key
var selectedArchive = null // selected Archive
var selectedPath = null // selected filepath within the Archive
var models = {} // url => mocaco model
var selectedModel = null // monaco model of the selected file
var dirtyFiles = {} // url => bool, which files have been modified?
var isViewingOptions = false // options screen on?
var editorOptions = {}

// HACK FIX
// the good folk of whatwg didnt think to include an event for pushState(), so let's add one
// -prf
var _wr = function(type) {
  var orig = window.history[type];
  return function() {
    var rv = orig.apply(this, arguments);
    var e = new Event(type.toLowerCase());
    e.arguments = arguments;
    window.dispatchEvent(e);
    return rv;
  };
};
window.history.pushState = _wr('pushState')
window.history.replaceState = _wr('replaceState')

// main
// =

readEditorOptions()
setup()
// dragDrop(document.body, onDragDrop) TODO
window.addEventListener('pushstate', loadFile)
window.addEventListener('popstate', loadFile)
window.addEventListener('render', update)
window.addEventListener('new-file', onNewFile)
window.addEventListener('new-folder', onNewFolder)
window.addEventListener('open-file', onOpenFile)
window.addEventListener('save-file', onSaveFile)
window.addEventListener('import-files', onImportFiles)
window.addEventListener('choose-path', onChoosePath)
window.addEventListener('open-settings', onOpenSettings)
window.addEventListener('editor-created', onEditorCreated)
window.addEventListener('keydown', onKeyDown)

async function setup () {
  try {
    let to = setTimeout(() => {
      // render loading screen (it's taking a sec)
      viewIsLoading = 'archive'
      update()
    }, 500)

    // parse out the archive key
    var selectedArchiveKey = await getURLKey()
    if (!selectedArchiveKey) {
      window.location = 'beaker://library/'
      return
    }

    // load the archive
    selectedArchive = new Archive(selectedArchiveKey)
    selectedArchive.fileTree = new FileTree(selectedArchive)
    await selectedArchive.setup()
    await selectedArchive.fileTree.setup()
    clearTimeout(to)
    selectedArchive.addEventListener('changed', onArchiveChanged)
    document.title = `${selectedArchive.niceName} - Editor`
    configureEditor()

    // render selected file
    viewIsLoading = false
    await loadFile()
  } catch (err) {
    // render the error state
    console.warn('Failed to fetch archive info', err)
    viewIsLoading = false
    viewError = err
    update()
  }
}

// view state management
// =

async function loadFile () {
  // abort if the editor isn't loaded yet, and this will re-run when it's ready
  if (!window.editor || !selectedArchive) {
    return update()
  }

  const path = getURLPath()
  const url = selectedArchive.url + '/' + path

  // update the selection
  selectedPath = path ? path : false

  // deselection
  if (!path) {
    selectedModel = null
    update()
    return
  }

  let to = setTimeout(() => {
    // render loading screen (it's taking a sec)
    viewIsLoading = 'file'
    update()
  }, 500)

  // load according to editability
  if (checkIfIsEditable(path)) {
    if (!models[url]) {
      let loadErr
      try {
        // load the file
        await load(selectedArchive, path)
      } catch (err) {
        console.error(err)
        if (err.notFound) {
          // somehow we were given a bad URL, just show the archive info
          selectedModel = null
          selectedPath = null
          viewIsLoading = false
          clearTimeout(to)
          update()
        } else {
          loadErr = err
        }
        return
      }

      // make sure the file is still wanted
      // (there's no way to cancel the load request but the user may have navigated away since the first req)
      let currentSelectedUrl = selectedArchive.url + '/' + getURLPath()
      if (currentSelectedUrl !== url) {
        return console.warn('Stopped load process because user navigated away')
      }
      if (loadErr) {
        // if errored, rethrow (they didnt nav away)
        if (loadErr.name === 'TimeoutError') {
          throw new Error('File not found on the network. No hosts found.')
        }
        throw loadErr
      }
    }
    editor.setModel(models[url])
    setTimeout(() => editor.focus(), 200) // some weird behavior requires we wait for a few ms
  } else {
    models[url] = {path, isEditable: false, lang: ''}
  }
  selectedModel = models[url]
  viewIsLoading = false
  clearTimeout(to)
  update()
}

async function getURLKey () {
  var path = window.location.pathname
  if (path === '/' || !path) return false
  try {
    // extract key from url
    var name = /^\/([^\/]+)/.exec(path)[1]
    if (/[0-9a-f]{64}/i.test(name)) return name
    return DatArchive.resolveName(name)
  } catch (e) {
    console.error('Failed to parse URL', e)
    throw new Error('Invalid dat URL')
  }
}

function getURLPath () {
  try {
    return window.location.pathname.split('/').filter(Boolean).slice(1).join('/') // drop '/{key}', take the rest
  } catch (e) {
    return ''
  }
}

function configureEditor () {
  if (!window.editor) return

  // set editor to read-only if not the owner
  editor.updateOptions({
    readOnly: (!selectedArchive || !selectedArchive.info.isOwner),
    wordWrap: editorOptions.wordWrap !== 'off',
    wrappingColumn: (
      editorOptions.wordWrap === 'off' ? -1 :
      editorOptions.wordWrap === 'auto' ? 0 :
      +editorOptions.wordWrapLength
    ),
    rulers: editorOptions.wordWrap === 'fixed' ? [+editorOptions.wordWrapLength] : [],
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    wordBasedSuggestions: false,
    hover: false
  })
}

// rendering
// =

function update () {
  var activeUrl = selectedPath ? `${selectedArchive.url}/${selectedPath}`: ''
  var isActiveFileDirty = selectedPath && dirtyFiles && dirtyFiles[activeUrl] // TODO needed?
  var isOwner = selectedArchive && selectedArchive.info.isOwner
  var isSaved = selectedArchive && selectedArchive.info.userSettings.isSaved
  var isEditable = isOwner && selectedModel && selectedModel.isEditable

  // render the editor or viewer
  var editorEl = document.querySelector('#editor-editor')
  var viewerEl = document.querySelector('#editor-viewer')
  if (selectedModel && selectedModel.isEditable && !isViewingOptions && !viewError && !viewIsLoading) {
    editorEl.classList.add('active')
    viewerEl.classList.remove('active')
  } else {
    editorEl.classList.remove('active')
    if (viewError) yo.update(viewerEl, rError())
    else if (viewIsLoading) yo.update(viewerEl, rLoading())
    else if (isViewingOptions) {
      yo.update(viewerEl, yo`
        <div id="editor-viewer" class="active">${renderEditorOptions(editorOptions, onSaveOptions, onToggleOptions)}</div>
      `)
    } else if (selectedModel) yo.update(viewerEl, yo`<div id="editor-viewer" class="active">${renderFileView(activeUrl)}</div>`)
    else yo.update(viewerEl, yo`<div id="editor-viewer" class="active"></div>`) // empty view
  }

  // render header
  updateHeader(selectedArchive, selectedPath, activeUrl, isSaved, isOwner, isEditable)

  // render files list
  updateFilesList(selectedArchive, selectedPath, dirtyFiles, isOwner)
}

function rError () {
  return yo`
    <div id="editor-viewer" class="active">
      <div class="message error archive-error">
        <div>
          <i class="fa fa-exclamation-triangle"></i>
          <span>${viewError.toString()}</span>
          <p>
            Check your internet connection, and make sure you can connect to a user hosting the archive.
          </p>
        </div>
        <div class="archive-error-narclink">
        <a href="https://github.com/beakerbrowser/beaker/issues" target="_blank">Report Issue</a>
        |
        <a href="https://groups.google.com/forum/#!forum/beaker-browser" target="_blank">Request Help</a>
      </div>
    </div>
  `
}

function rLoading (archive, opts) {
  return yo`
    <div id="editor-viewer" class="active">
      <div class="message primary">
        <div class="spinner"></div>
        <div><strong>Searching the network for this ${viewIsLoading}. Please wait...</strong></div>
        <p>Try:</p>
        <ul>
          <li>Checking your connection</li>
          <li>Checking your firewall settings</li>
        </ul>
        <p>
          Having trouble? <a href="https://groups.google.com/forum/#!forum/beaker-browser" target="_blank">Ask for help</a> or <a href="https://github.com/beakerbrowser/beaker/issues" target="_blank">Report a bug</a>.
        </p>
      </div>
    </div>
  `
}

// event handlers
// =

async function onEditorCreated () {
  configureEditor()
  try {
    await loadFile()
  } catch (err) {
    // render the error state
    console.warn('Failed to fetch file info', err)
    viewIsLoading = false
    viewError = err
    update()
  }
}

async function onNewFile (e) {
  var path = `buffer~~${Date.now()}`
  var model = await generate(selectedArchive, path)
  model.suggestedPath = e.detail && e.detail.path
  window.history.pushState(null, '', `beaker://editor/${selectedArchive.info.key}/${path}`)
}

async function onNewFolder (e) {
  choosePathPopup.create(selectedArchive, {
    action: 'create-folder',
    path: e.detail ? e.detail.path : ''
  })
}

async function onOpenFile (e) {
  // stop editing arhive details
  if (selectedArchive) {
    selectedArchive.isEditingDetails = false
  }

  // update the location
  var archive = e.detail.archive
  var path = e.detail.path || ''
  window.history.pushState(null, '', `beaker://editor/${archive.info.key}/${path}`)
}

function onSaveFile (e) {
  save()
}

async function onImportFiles (e) {
  // pick files
  var files = await beakerBrowser.showOpenDialog({
    title: 'Choose a folder or files to import',
    buttonLabel: 'Import',
    properties: ['openFile', 'openDirectory', 'multiSelections', 'createDirectory', 'showHiddenFiles']
  })
  if (!files) {
    return
  }

  // pick the destination
  var dst
  if (e.detail) {
    dst = e.detail.dst
  } else {
    let path = await choosePathPopup.create(selectedArchive, {
      action: 'import-files',
      path: ''
    })
    dst = selectedArchive.url + '/' + path
  }

  // import
  await Promise.all(files.map(srcPath => {
    // send to backend
    return DatArchive.importFromFilesystem({srcPath, dst, inplaceImport: false})
  }))
}

async function onChoosePath (e) {
  var {path, action} = e.detail
  if (!selectedArchive) {
    return
  }
  if (action === 'save-file') {
    if (!selectedModel) return
    // get content
    var content = selectedModel.getValue()

    // close current model
    closeModel()

    // generate new model
    var model = await generate(selectedArchive, path, content)

    // save content
    selectedModel = model
    await save()

    // go to file
    window.history.pushState(null, '', `beaker://editor/${selectedArchive.info.key}/${model.path}`)
  }
  if (action === 'create-folder') {
    if (!selectedArchive) return
    try {
      await selectedArchive.createDirectory(path)
      update()
    } catch (e) {
      alert('' + e)
    }

  }
}

function onDragDrop (files) {
  // TODO
  // if (selectedArchive) {
  //   addFiles(selectedArchive, files)
  // }
}

function onDidChangeContent (archive, path) {
  return e => {
    const url = archive.url + '/' + path
    if (!dirtyFiles[url]) {
      // update state and render
      dirtyFiles[url] = true
      update()
    }
  }
}

function onKeyDown (e) {
  if ((e.metaKey || e.ctrlKey) && e.keyCode === 83/*'S'*/) {
    e.preventDefault()
    save()
  }
  if (e.keyCode === 27/*Escape*/) {
    if (selectedArchive && selectedArchive.isEditingDetails) {
      // exit details editor
      selectedArchive.isEditingDetails = false
      update()
    }
  }
}

async function onArchiveChanged (e) {
  // reload the file listing
  await selectedArchive.fileTree.setup()
  update()
}

function onSaveOptions (values) {
  // update opts
  for (var k in values) {
    editorOptions[k] = values[k]
  }
  writeEditorOptions()

  // update editor
  configureEditor()
  for (var url in models) {
    if (models[url].updateOptions) {
      models[url].updateOptions(getModelOptions())
    }
  }

  // render
  isViewingOptions = false
  update()
}

function onOpenSettings () {
  isViewingOptions = true
  update()
}

function onToggleOptions () {
  isViewingOptions = !isViewingOptions
  update()
}


// helpers
// =

function readEditorOptions () {
  try {
    editorOptions = JSON.parse(localStorage.options)
  } catch (e) {
    editorOptions = defaultEditorOptions()
  }
}

function writeEditorOptions () {
  localStorage.options = JSON.stringify(editorOptions)
}

function getModelOptions () {
  return {
    insertSpaces: editorOptions.tabs === 'spaces',
    tabSize: +editorOptions.tabWidth
  }
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

async function generate (archive, path, content='') {
  const url = archive.url + '/' + path

  // setup the model
  models[url] = monaco.editor.createModel(content, null, monaco.Uri.parse(url))
  models[url].path = path
  models[url].isEditable = true
  models[url].lang = models[url].getModeId()
  models[url].onDidChangeContent(onDidChangeContent(archive, path))
  models[url].updateOptions(getModelOptions())
  dirtyFiles[url] = true
  archive.fileTree.addNode({ type: 'file', name: path })
  return models[url]
}

async function load (archive, path) {
  // load the file content
  const url = archive.url + '/' + path
  const str = await archive.readFile(path, 'utf8')

  // setup the model
  models[url] = monaco.editor.createModel(str, null, monaco.Uri.parse(url))
  models[url].path = path
  models[url].isEditable = true
  models[url].lang = models[url].getModeId()
  models[url].onDidChangeContent(onDidChangeContent(archive, path))
  models[url].updateOptions(getModelOptions())
}

async function save () {
  if (!selectedModel || !dirtyFiles[selectedModel.uri.toString()]) {
    return
  }

  // do we need to pick a filename?
  if (selectedModel.path.startsWith('buffer~~')) {
    return choosePathPopup.create(selectedArchive, {path: selectedModel.suggestedPath})
  }

  // write the file content
  await selectedArchive.writeFile(selectedModel.path, selectedModel.getValue(), 'utf-8')

  // update state and render
  delete dirtyFiles[selectedModel.uri.toString()]
  update()
}

function closeModel () {
  var url = selectedArchive.url + '/' + selectedModel.path
  selectedModel.dispose()
  selectedModel = null
  delete models[url]
  delete dirtyFiles[url]
  // TODO remove from filetree
}

// find any models that don't need to stay in memory and delete them
function freeCleanModels () {
  for (var k in models) {
    if (!dirtyFiles[k]) {
      if (models[k] && models[k].dispose) {
        models[k].dispose()
      }
      delete models[k]
      delete dirtyFiles[k]
    }
  }
}