import yo from 'yo-yo'
import co from 'co'
import {Archive, ArchivesList} from 'builtin-pages-lib'
import {render as renderArchivesList} from './com/archives-list'
import {render as renderArchiveView} from './com/archive-view'
import {addFiles} from './com/archive-files'
import {forkArchiveFlow} from './com/modals/fork-dat'
import {pushUrl} from '../lib/fg/event-handlers'
import {ucfirst} from '../lib/strings'
import dragDrop from '../lib/fg/drag-drop'

// globals
// =

var viewError = null
var viewIsLoading = false
var archivesList = null
var selectedArchiveKey = null
var selectedArchive = null
var currentFilter = ''

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

setup()
dragDrop('.window', onDragDrop)
window.addEventListener('pushstate', setup)
window.addEventListener('popstate', setup)
window.addEventListener('render', render)

function setup () {
  co(function * () {
    var newArchiveKey = yield getURLKey()

    if (selectedArchiveKey === newArchiveKey) {
      // a navigation within the same view
      return handleInnerNavigation()
    }

    // load the archive list, if needed
    if (!archivesList) {
      archivesList = new ArchivesList()
      yield archivesList.setup({isSaved: true})
      archivesList.addEventListener('changed', render)
    }

    // update the archive, as needed
    if (newArchiveKey !== selectedArchiveKey) {
      if (selectedArchive) {
        selectedArchive.destroy()
        selectedArchive = null
      }

      if (newArchiveKey) {
        let to = setTimeout(() => {
          // render loading screen (it's taking a sec)
          viewIsLoading = true
          render()
        }, 500)

        // load the archive
        selectedArchive = new Archive(newArchiveKey)
        yield selectedArchive.setup()
        selectedArchive.addEventListener('changed', render)
        // setCurrentNodeByPath()
        clearTimeout(to)
      }
      selectedArchiveKey = newArchiveKey
    }

    // render output
    viewIsLoading = false
    render()

    // now that it has loaded, redirect to dat:// if this was a timeout view
    if (window.location.hash === '#timeout') {
      var destURL = 'dat://' + /^library\/(.*)/.exec(window.location.pathname)[1]
      console.log('Archive found! Redirecting to', destURL)
      window.location = destURL
      return
    }

    // run the fork modal, if that's why we're here
    if (window.location.hash === '#fork') {
      forkArchiveFlow(selectedArchive)
      window.location.hash = ''
    }
  }).catch(err => {
    // render the error state
    console.warn('Failed to fetch archive info', err)
    viewError = err
    render()
  })
}

// view state management
// =

// called when there's a navigation that doesnt change the current archive
function handleInnerNavigation () {
  setCurrentNodeByPath()
  render()
}

function * getURLKey () {
  var path = window.location.pathname
  if (/^library\/?$/.test(path)) return false
  try {
    // extract key from url
    var name = /^library\/([^\/]+)/.exec(path)[1]
    if (/[0-9a-f]{64}/i.test(name)) return name
    return yield DatArchive.resolveName(name)
  } catch (e) {
    console.error('Failed to parse URL', e)
    return false
  }
}

function getURLPath () {
  try {
    return window.location.pathname.split('/').slice(2).join('/') // drop 'archive/{key}', take the rest
  } catch (e) {
    return ''
  }
}

// use the current url's path to set the current rendered node
function setCurrentNodeByPath () {
  if (!selectedArchive) return
  var names = window.location.pathname.split('/').slice(2) // drop 'archive/{name}', take the rest
  selectedArchive.files.setCurrentNodeByPath(names)
}

// rendering
// =

function render () {
  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="archives">
      ${renderArchivesList(archivesList, {selectedArchiveKey, currentFilter, onChangeFilter})}
      ${renderArchiveView(selectedArchive, {viewIsLoading, viewError})}
    </div>
  </div>`)
}

// event handlers
// =

function onChangeFilter (e) {
  currentFilter = (e.target.value.toLowerCase())
  render()
}

function onDragDrop (files) {
  if (selectedArchive) {
    addFiles(selectedArchive, files)
  }
}