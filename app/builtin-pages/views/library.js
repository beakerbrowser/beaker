/* globals Event beaker DatArchive history confirm */

import * as yo from 'yo-yo'
import {STANDARD_ARCHIVE_TYPES} from '../../lib/const'
import renderSidebar from '../com/sidebar'
import {
  FSVirtualRoot,
  FSVirtualFolder_User,
  FSVirtualFolder_Network
} from 'beaker-virtual-fs'
import renderFiles from '../com/files-columns-view'

// globals
// =

var selectedPath = []
var fsRoot = new FSVirtualRoot()

setup()
async function setup () {
  // load and render
  await fsRoot.readData()
  await readSelectedPathFromURL()
  update()

  // scroll to the rightmost point
  const container = document.querySelector('.files-columns-view')
  container.scrollLeft = container.scrollWidth
}

// rendering
// =

function update () {
  yo.update(document.querySelector('.library-wrapper'), yo`
    <div
      class="library-wrapper builtin-wrapper"
      oncontextmenu=${onContextMenu}
    >
      ${renderSidebar('library')}
      <div class="builtin-main">
        ${renderFiles(fsRoot, {filesListView: true, selectedPath, onSelection})}
      </div>
    </div>
  `)
}

// event handlers
// =

function onSelection (path) {
  selectedPath = path
  var node = path[path.length - 1]

  // update the url
  if (node && node.type === 'archive') {
    window.history.replaceState({}, null, node._archiveInfo.key)
  } else {
    window.history.replaceState({}, null, '/')
  }
}

async function onContextMenu (e) {
  e.preventDefault()
  e.stopPropagation()

  const action = await beaker.browser.showContextMenu([
    {type: 'submenu', label: 'New...', submenu: [
      {label: 'Application', id: 'new-application'},
      {label: 'Code module', id: 'new-module'},
      {label: 'Dataset', id: 'new-dataset'},
      {label: 'Documents folder', id: 'new-document'},
      {label: 'Music folder', id: 'new-music'},
      {label: 'Photos folder', id: 'new-photo'},
      {label: 'Videos folder', id: 'new-video'},
      {label: 'Website', id: 'new-website'}
    ]}
  ])
  if (action && action.startsWith('new')) {
    var archive = await DatArchive.create({prompt: true, type: action.slice('new-'.length)})
    window.location.pathname = archive.url.slice('dat://'.length)
  }
}

// helpers
// =

async function readSelectedPathFromURL () {
  try {
    var key = window.location.pathname.slice(1)
    if (!key) {
      // default to home
      selectedPath.push(fsRoot.children.find(node => node instanceof FSVirtualFolder_User))
      await selectedPath[0].readData()
      return
    }

    // try to find a path to the given archive
    var archive = new DatArchive(key)
    var info = await archive.getInfo()

    // start with provenance
    if (info.isOwner && info.userSettings.isSaved) {
      selectedPath.push(fsRoot.children.find(node => node instanceof FSVirtualFolder_User))
      await selectedPath[0].readData()
    } else {
      // check if it's === to or authored by a profile in our network list
      let userNode = fsRoot.children.find(node => (
        node._profile && (
          node._profile._origin === info.url ||
          (info.author && node._profile._origin === info.author.url)
        )
      ))
      if (userNode) {
        selectedPath.push(userNode)
        await selectedPath[0].readData()
      } else {
        // use 'Network' and add this archive if it does not exist
        selectedPath.push(fsRoot.children.find(node => node instanceof FSVirtualFolder_Network))
        await selectedPath[0].readData()
        selectedPath[0].addArchive(info)
      }
    }

    // next, choose type
    var type = findStandardType(info.type)
    if (type) {
      selectedPath.push(selectedPath[0].children.find(node => node._type === type))
    } else {
      selectedPath.push(selectedPath[0].children[0])
    }
    await selectedPath[1].readData()

    // now select the archive
    selectedPath.push(selectedPath[1].children.find(node => node._archiveInfo.key === key))
    await selectedPath[2].readData()
  } catch (e) {
    // ignore, but log just in case something is buggy
    console.debug(e)
  }
}

function findStandardType (type) {
  if (!type || !type.length) return false
  type = type.filter(f => STANDARD_ARCHIVE_TYPES.includes(f))
  return type[0]
}