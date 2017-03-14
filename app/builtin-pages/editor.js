import yo from 'yo-yo'
import mime from 'mime'
import {Archive, ArchivesList, FileTree} from 'builtin-pages-lib'
import {render as renderArchivesList, renderArchivesListItems} from './com/archives-list'
import {render as renderArchiveView} from './com/editor-archive-view'
import {render as renderEditorOptions, defaultEditorOptions} from './com/editor-options'
import {pushUrl} from '../lib/fg/event-handlers'
import {ucfirst} from '../lib/strings'
import dragDrop from '../lib/fg/drag-drop'

// globals
// =

var viewError = null // toplevel error object
var viewIsLoading = false // toplevel, is loading? false, 'archive', or 'file'
var archivesList = null // ArchiveList, loaded once
var currentFilter = '' // archivesList filter
var isArchivesListCollapsed = false // render archives list collapsed?
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
setSidebarCollapsed(localStorage.isArchivesListCollapsed)
setup()
// dragDrop(document.body, onDragDrop) TODO
window.addEventListener('pushstate', setup)
window.addEventListener('popstate', setup)
window.addEventListener('render', render)
window.addEventListener('new-file', onNewFile)
window.addEventListener('open-file', onOpenFile)
window.addEventListener('save-file', onSaveFile)
window.addEventListener('editor-created', onEditorCreated)
window.addEventListener('keydown', onKeyDown)

async function setup () {
  try {
    // reset some state
    viewError = null
    var newArchiveKey = await getURLKey()

    if (selectedArchiveKey === newArchiveKey) {
      // a navigation within the same view
      return await setupFile()
    }

    // load the archive list, if needed
    if (!archivesList) {
      archivesList = new ArchivesList()
      await archivesList.setup({isSaved: true})
      archivesList.addEventListener('changed', render)
    }

    // update the archive, as needed
    if (newArchiveKey !== selectedArchiveKey) {
      if (selectedArchive) {
        freeCleanModels()
        selectedArchive.destroy()
        selectedArchive = null
        selectedPath = null
      }

      if (newArchiveKey) {
        let to = setTimeout(() => {
          // render loading screen (it's taking a sec)
          viewIsLoading = 'archive'
          render()
        }, 500)

        // load the archive
        selectedArchive = new Archive(newArchiveKey)
        selectedArchive.fileTree = new FileTree(selectedArchive)
        await selectedArchive.setup()
        await selectedArchive.fileTree.setup()
        selectedArchive.addEventListener('changed', onArchiveChanged)
        document.title = `${selectedArchive.niceName} - Editor`
        configureEditor()
        clearTimeout(to)
      }
      selectedArchiveKey = newArchiveKey
    }

    // render output
    viewIsLoading = false
    await setupFile()
  } catch (err) {
    // render the error state
    console.warn('Failed to fetch archive info', err)
    viewIsLoading = null
    viewError = err
    render()
  }
}

// view state management
// =

async function setupFile () {
  // abort if the editor isn't loaded yet, and this will re-run when it's ready
  if (!window.editor || !selectedArchive) {
    return render()
  }

  const path = getURLPath()
  const url = selectedArchive.url + '/' + path

  // update the selection
  selectedPath = path ? path : false

  // deselection
  if (!path) {
    selectedModel = null
    render()
    return
  }

  let to = setTimeout(() => {
    // render loading screen (it's taking a sec)
    viewIsLoading = 'file'
    render()
  }, 500)

  // load according to editability
  if (checkIfIsEditable(path)) {
    if (!models[url]) {
      let loadErr
      try {
        // load the file
        await load(selectedArchive, path)
      } catch (err) {
        loadErr = err
      }

      // make sure the file is still wanted
      // (there's no way to cancel the load request but the user may have navigated away since the first req)
      let currentSelectedUrl = selectedArchive.url + '/' + getURLPath()
      if (currentSelectedUrl !== url) {
        return console.warn('Stopped load process because user navigated away')
      }
      if (loadErr) {
        // if errored, rethrow (they didnt nav away)
        throw loadErr
      }
    }
    editor.setModel(models[url])
  } else {
    models[url] = {path, isEditable: false, lang: ''}
  }
  selectedModel = models[url]
  viewIsLoading = false
  clearTimeout(to)
  render()
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
    return false
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
    quickSuggestions: editorOptions.autoSuggest,
    suggestOnTriggerCharacters: editorOptions.autoSuggest,
    wordBasedSuggestions: editorOptions.autoSuggest,
    hover: editorOptions.hover
  })
}

// rendering
// =

function render () {
  // show/hide the editor
  var editorEl = document.getElementById('el-editor-container')
  if (selectedModel && selectedModel.isEditable && !isViewingOptions && !viewError) {
    editorEl.classList.add('active')
  } else {
    editorEl.classList.remove('active')
  }

  // render view
  yo.update(document.querySelector('#el-content'), yo`<div id="el-content">
    <div class="archives">
      ${renderArchivesList(archivesList, {selectedArchiveKey, currentFilter, onChangeFilter, selectedPath, isArchivesListCollapsed, onCollapseToggle, onToggleOptions})}
      ${isViewingOptions
        ? renderEditorOptions({onSaveOptions, onToggleOptions, values: editorOptions})
        : renderArchiveView(selectedArchive, {viewIsLoading, viewError, selectedPath, selectedModel, dirtyFiles})}
    </div>
  </div>`)
}

// event handlers
// =

async function onEditorCreated () {
  configureEditor()
  try {
    await setupFile()
  } catch (err) {
    // render the error state
    console.warn('Failed to fetch archive info', err)
    viewIsLoading = null
    viewError = err
    render()
  }
}

function onChangeFilter (e) {
  currentFilter = (e.target.value.toLowerCase())
  yo.update(document.querySelector('.archives-list'), yo`<ul class="archives-list">
    ${renderArchivesListItems(archivesList, {selectedArchiveKey, currentFilter})}
  </ul>`)
}

function onCollapseToggle (e) {
  e.stopPropagation()
  setSidebarCollapsed(!isArchivesListCollapsed)
  render()
}

async function onNewFile (e) {
  var {path} = e.detail
  generate(selectedArchive, path)
  window.history.pushState(null, '', `beaker://editor/${selectedArchive.info.key}/${path}`)
}

async function onOpenFile (e) {
  // update the location
  var archive = e.detail.archive
  var path = e.detail.path || ''
  window.history.pushState(null, '', `beaker://editor/${archive.info.key}/${path}`)
}

function onSaveFile (e) {
  save()
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
      render()
    }
  }
}

function onKeyDown (e) {
  if ((e.metaKey || e.ctrlKey) && e.keyCode === 83/*'S'*/) {
    e.preventDefault()
    save()
  }
}

async function onArchiveChanged (e) {
  // reload the file listing
  await selectedArchive.fileTree.setup()
  render()
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
  render()
}

function onToggleOptions () {
  isViewingOptions = !isViewingOptions
  render()
}


// helpers
// =

function setSidebarCollapsed (collapsed) {
  isArchivesListCollapsed = collapsed
  if (isArchivesListCollapsed) {
    localStorage.isArchivesListCollapsed = 1
    document.body.classList.add('sidebar-collapsed')
  } else {
    delete localStorage.isArchivesListCollapsed
    document.body.classList.remove('sidebar-collapsed')    
  }
}

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

function generate (archive, path) {
  // setup the model
  const url = archive.url + '/' + path
  models[url] = monaco.editor.createModel('', null, monaco.Uri.parse(url))
  models[url].path = path
  models[url].isEditable = true
  models[url].lang = models[url].getModeId()
  models[url].onDidChangeContent(onDidChangeContent(archive, path))
  models[url].updateOptions(getModelOptions())
  dirtyFiles[url] = true
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

  // write the file content
  await selectedArchive.writeFile(selectedModel.path, selectedModel.getValue(), 'utf-8')

  // update state and render
  dirtyFiles[selectedModel.uri.toString()] = false
  render()
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