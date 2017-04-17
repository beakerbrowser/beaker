import yo from 'yo-yo'
import mime from 'mime'
import {Archive, FileTree} from 'builtin-pages-lib'
import {render as renderEditorOptions, defaultEditorOptions} from '../com/editor-options'
import {update as updateFilesList} from '../com/editor-files-list'
import {render as renderFileView} from '../com/editor-file-view'
import {update as updateHeader} from '../com/editor-header'
import setupContextMenu from '../com/editor-context-menu'
import * as choosePathPopup from '../com/editor-choose-path-popup'
import * as toast from '../com/toast'
import defineTheme from '../com/monaco-theme'
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
setupContextMenu()
setup()
dragDrop(document.body, onDragDrop)
window.addEventListener('pushstate', loadFile)
window.addEventListener('popstate', loadFile)
window.addEventListener('render', update)
window.addEventListener('new-file', onNewFile)
window.addEventListener('new-folder', onNewFolder)
window.addEventListener('open-file', onOpenFile)
window.addEventListener('save-file', onSaveFile)
window.addEventListener('close-file', onCloseFile)
window.addEventListener('import-files', onImportFiles)
window.addEventListener('rename', onRename)
window.addEventListener('delete', onDelete)
window.addEventListener('open-settings', onOpenSettings)
window.addEventListener('editor-created', onEditorCreated)
window.addEventListener('keydown', onKeyDown)
window.addEventListener('beforeunload', onBeforeUnload)

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
    document.title = `${selectedArchive.niceName} - Editor`
    configureEditor()

    // wire events
    selectedArchive.addEventListener('changed', onArchiveChanged)
    var fileEvents = selectedArchive.createFileActivityStream()
    fileEvents.addEventListener('changed', onFileChanged)

    // load selected file
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

  // close any non-dirty models
  closeHalfOpenModels()

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
    theme: 'beaker',
    readOnly: (!selectedArchive || !selectedArchive.info.isOwner),
    wordWrap: editorOptions.wordWrap !== 'off',
    wrappingColumn: (
      editorOptions.wordWrap === 'off' ? -1 :
      editorOptions.wordWrap === 'auto' ? 0 :
      +editorOptions.wordWrapLength
    ),
    rulers: editorOptions.wordWrap === 'fixed' ? [+editorOptions.wordWrapLength] : [],
    renderLineHighlight: 'gutter',
    contextmenu: false,
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
    else if (selectedArchive) yo.update(viewerEl, rBlankScreen())
  }

  // render header
  updateHeader(selectedArchive, selectedPath, activeUrl, isSaved, isOwner, isEditable)

  // render files list
  updateFilesList(selectedArchive, selectedPath, models, dirtyFiles)
}

function rBlankScreen () {
  var info = selectedArchive.info
  const title = () =>
    (!info.title && info.isOwner) ? yo`<em>Choose a title</em>` : info.title
  const description = () =>
    (!info.description && info.isOwner) ? yo`<em>Choose a description</em>` : info.description
  const editable = inner =>
    (info.isOwner) ? yo`<div><div class="editable" onclick=${onUpdate}>${inner}</div></div>` : inner
  const onUpdate = () => beaker.archives.updateManifest(selectedArchive.url)
  return yo`
    <div id="editor-viewer" class="active">
      <div class="editor-blank-screen">
        <i class="fa fa-pencil-square-o"></i>
        ${editable(yo`<h3>${title()}</h3>`)}
        ${editable(yo`<div>${description()}</div>`)}
      </div>
    </div>
  `
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
  defineTheme(window.monaco)
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
  model.suggestedPath = e && e.detail && e.detail.path
  window.history.pushState(null, '', `beaker://editor/${selectedArchive.info.key}/${path}`)
}

async function onNewFolder (e) {
  var path = await choosePathPopup.create(selectedArchive, {
    action: 'create-folder',
    path: e.detail ? e.detail.path : ''
  })
  try {
    await selectedArchive.mkdir(path)
    update()
  } catch (e) {
    alert('' + e)
  }
}

async function onOpenFile (e) {
  // stop editing archive details
  if (selectedArchive) {
    selectedArchive.isEditingDetails = false
  }
  var archive = e.detail.archive
  var path = e.detail.path || ''

  // update the location
  if (path !== selectedPath) {
    window.history.pushState(null, '', `beaker://editor/${archive.info.key}/${path}`)
  }

  // fully open?
  if (e.detail.fullyOpen && selectedModel) {
    selectedModel.isFullyOpen = true
    update()
  }
}

function onSaveFile (e) {
  save()
}

function onCloseFile (e) {
  var selectedModelURL = selectedModel ? selectedModel.uri.toString() : undefined
  var url = (e.detail && e.detail.path)
    ? (e.detail.archive.url + '/' + e.detail.path)
    : selectedModelURL
  var isCurrent = url === selectedModelURL

  // prompt before closing
  if (url && dirtyFiles[url]) {
    if (!confirm('Are you sure you want to close this file? Your changes will be lost if you don\'t save them.')) {
      return false
    }
  }

  // close
  closeModel(url)

  // update view
  if (isCurrent) {
    let path = ''
    let modelUrls = Object.keys(models)
    if (modelUrls[0]) path = models[modelUrls[0]].path
    window.history.pushState(null, '', `beaker://editor/${selectedArchive.info.key}/${path}`)
  } else {
    update()
  }
}

async function onImportFiles (e) {
  var dst = null
  if (e && e.detail && e.detail.path) {
    dst = selectedArchive.url + '/' + e.detail.path
  }

  // pick files
  var paths = await beakerBrowser.showOpenDialog({
    title: 'Choose a folder or files to import',
    buttonLabel: 'Import',
    properties: ['openFile', 'openDirectory', 'multiSelections', 'createDirectory', 'showHiddenFiles']
  })
  if (!paths) {
    return
  }
  return doImport(paths, dst)
}

function onDragDrop (files) {
  var paths = files.map(f => f.path)
  return doImport(paths)
}

async function onRename (e) {
  // TODO
}

async function onDelete (e) {
  // delete files
  var path = e.detail.path
  var st = await selectedArchive.stat(path)
  if (st.isDirectory()) {
    if (!confirm('Delete folder?')) return
    await selectedArchive.rmdir(path, {recursive: true})
  } else {
    if (!confirm('Delete file?')) return
    await selectedArchive.unlink(path)
  }
}

function onDidChangeContent (model) {
  return e => {
    const url = selectedArchive.url + '/' + model.path
    // update state and render
    var isDirty = model.savedAlternativeVersionId !== model.getAlternativeVersionId()
    model.isFullyOpen = true
    if (isDirty && !dirtyFiles[url]) {
      dirtyFiles[url] = true
      update()
    } else if (!isDirty && dirtyFiles[url]) {
      delete dirtyFiles[url]
      update()
    }
  }
}

function onKeyDown (e) {
  if ((e.metaKey || e.ctrlKey) && e.keyCode === 83/*'S'*/) {
    e.preventDefault()
    return save()
  }
  if (e.keyCode === 27/*Escape*/) {
    if (selectedArchive && selectedArchive.isEditingDetails) {
      // exit details editor
      selectedArchive.isEditingDetails = false
      return update()
    }
  }
}

function onBeforeUnload (e) {
  if (Object.keys(dirtyFiles).length) {
    e.returnValue = true
  }
}

async function onArchiveChanged (e) {
  // reload the file listing
  await selectedArchive.fileTree.setup()
  update()
}

async function onFileChanged (e) {
  // a file we have loaded?
  var path = e.path
  var url = selectedArchive.url + path
  var model = models[url]
  if (model) {
    // maybe reload content
    if (model.isEditable) {
      // did change?
      const newValue = await selectedArchive.readFile(path, 'utf8')
      if (newValue === model.getValue()) {
        return // no
      }

      clearDidChangeEvent(model) // temporarily disable change event
      model.setValue(newValue) // update value
      setDidChangeEvent(model) // re-enable change event
    } else {
      // re-render view
      update()
    }
  }
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
  var model = models[url] = monaco.editor.createModel(content, null, monaco.Uri.parse(url))
  model.savedAlternativeVersionId = 1
  model.path = path
  model.isEditable = true
  model.isFullyOpen = true
  model.lang = model.getModeId()
  setDidChangeEvent(model)
  model.updateOptions(getModelOptions())
  return model
}

async function load (archive, path) {
  // load the file content
  const url = archive.url + '/' + path
  const str = await archive.readFile(path, 'utf8')

  // setup the model
  var model = models[url] = monaco.editor.createModel(str, null, monaco.Uri.parse(url))
  model.savedAlternativeVersionId = 1
  model.path = path
  model.isEditable = true
  model.isFullyOpen = false
  model.lang = model.getModeId()
  setDidChangeEvent(model)
  model.updateOptions(getModelOptions())
}

async function save () {
  var newPath
  if (!selectedModel || !dirtyFiles[selectedModel.uri.toString()]) {
    return
  }

  // do we need to pick a filename?
  if (selectedModel.path.startsWith('buffer~~')) {
    newPath = await choosePathPopup.create(
      selectedArchive,
      {path: selectedModel.suggestedPath}
    )

    // generate new model
    let content = selectedModel.getValue()
    closeModel()
    selectedModel = await generate(selectedArchive, newPath, content)
  }

  // write the file content
  await selectedArchive.writeFile(selectedModel.path, selectedModel.getValue(), 'utf-8')

  // update state and render
  selectedModel.savedAlternativeVersionId = selectedModel.getAlternativeVersionId()
  delete dirtyFiles[selectedModel.uri.toString()]
  update()

  if (newPath) {
    // go to file
    window.history.pushState(null, '', `beaker://editor/${selectedArchive.info.key}/${newPath}`)
  }
}

function closeModel (url) {
  var url = url ? url : selectedArchive.url + '/' + selectedModel.path
  var model = models[url]
  if (!model) return

  if (model.dispose) {
    model.dispose()
  }
  model = null
  delete models[url]
  delete dirtyFiles[url]
}

function closeHalfOpenModels () {
  for (var url in models) {
    if (!models[url].isFullyOpen) {
      closeModel(url)
    }
  }
}

async function doImport (paths, dst) {
  // pick the destination
  if (!dst) {
    let path = await choosePathPopup.create(selectedArchive, {
      action: 'import-files',
      path: ''
    })
    dst = selectedArchive.url + '/' + path
  }

  // import
  await Promise.all(paths.map(src => {
    // send to backend
    return DatArchive.importFromFilesystem({src, dst, inplaceImport: false})
  }))
  toast.create(`Imported ${paths.length} ${paths.length > 1 ? 'files' : 'file'}.`)
}

function setDidChangeEvent (model) {
  model.didChangeEvt = model.onDidChangeContent(onDidChangeContent(model))
}

function clearDidChangeEvent (model) {
  model.didChangeEvt.dispose()
}