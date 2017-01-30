/*
This uses the datInternalAPI API, which is exposed by webview-preload to all archives loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import {Archive, ArchivesList} from 'builtin-pages-lib'
import { render as renderArchivesList } from '../com/archives-list'
import { render as renderArchiveView } from '../com/archive-view'
import { addFiles } from '../com/archive-files'
import { forkArchiveFlow } from '../com/modals/fork-dat'
import { pushUrl } from '../../lib/fg/event-handlers'
import { ucfirst } from '../../lib/strings'
import dragDrop from '../../lib/fg/drag-drop'

// globals
// =

var viewError = null
var viewIsLoading = false
var archivesList = null
var selectedArchiveKey = null
var selectedArchive = null
var currentFilter = ''
var isViewActive = false

// exported API
// =

export function setup () {
  dragDrop('.window', onDragDrop)
}

export function show (isSameView) {
  viewError = false
  isViewActive = true
  document.title = 'Library'

  co(function * () {
    var newArchiveKey = getURLKey()
    setSiteInfoOverride(newArchiveKey)
    if (isSameView && selectedArchiveKey === newArchiveKey) {
      // a navigation within the same view
      return handleInnerNavigation()
    }

    // load the archive list, if needed
    if (!archivesList) {
      archivesList = new ArchivesList()
      yield archivesList.setup({filter: {isSaved: true}})
      archivesList.on('changed', render)
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
        selectedArchive = new Archive()
        yield selectedArchive.fetchInfo(newArchiveKey)
        selectedArchive.on('changed', render)
        setCurrentNodeByPath()
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

    // run the tour if this is the owner's first time
    // TODO
    // const tourSeenSetting = 'has-seen-viewdat-tour'
    // var hasSeenTour = false
    // try { hasSeenTour = yield datInternalAPI.getGlobalSetting(tourSeenSetting) }
    // catch (e) {}
    // if (!hasSeenTour) {
    //   helpTour.startViewDatTour(archive.info.isOwner, render, true)
    //   yield datInternalAPI.setGlobalSetting(tourSeenSetting, true)
    // }
  }).catch(err => {
    // render the error state
    console.warn('Failed to fetch archive info', err)
    viewError = err
    render()
  })
}

export function hide (isSameView) {
  var newArchiveKey = getURLKey()
  if (isSameView && selectedArchiveKey === newArchiveKey) {
    // do nothing, it's a navigation within the current archive's folder structure
    return
  }

  isViewActive = false
  window.locationbar.setSiteInfoOverride(false)
  if (archivesList) archivesList.destroy()
  if (selectedArchive) selectedArchive.destroy()
  archivesList = null
  selectedArchiveKey = null
  selectedArchive = null

  if (!isSameView || !newArchiveKey) {
    // turn off the filter if its a nav to a new view, or to the toplevel
    currentFilter = ''
  }
}

// view state management
// =

// called when there's a navigation that doesnt change the current archive
function handleInnerNavigation () {
  setCurrentNodeByPath()
  render()
}

function getURLKey () {
  var path = window.location.pathname
  try {
    // extract key from url
    return /^library\/([0-9a-f]{64})/.exec(path)[1]
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

// override the site info in the navbar
function setSiteInfoOverride (archiveKey) {
  window.locationbar.setSiteInfoOverride({
    title: 'Site Library',
    url: (archiveKey) ? `dat://${archiveKey}/${getURLPath()}${window.location.hash}` : undefined
  })
}

// use the current url's path to set the current rendered node
function setCurrentNodeByPath () {
  if (!selectedArchive) return
  var names = window.location.pathname.split('/').slice(2) // drop 'archive/{name}', take the rest
  selectedArchive.files.setCurrentNodeByPath(names)
}

// rendering
// =

export function render () {
  if (!isViewActive) {
    return
  }

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
