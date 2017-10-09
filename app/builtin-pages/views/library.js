/* globals beaker DatArchive */

import * as yo from 'yo-yo'
import renderSidebar from '../com/sidebar'
import {
  FSVirtualRoot,
  FSVirtualFolder_User,
  FSVirtualFolder_Network
} from 'beaker-virtual-fs'
import FilesBrowser from '../com/files-browser'

// globals
// =

var fsRoot = new FSVirtualRoot()
var filesBrowser

setup()
async function setup () {
  // load and render
  await fsRoot.readData()
  filesBrowser = new FilesBrowser(fsRoot)
  filesBrowser.onSetCurrentSource = onSetCurrentSource
  await readSelectedPathFromURL()
  update()

  // wire up events
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('popstate', onPopState)
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
        ${filesBrowser.render()}
      </div>
    </div>
  `)
}

// event handlers
// =

function onKeyDown (e) {
  if (e.code.startsWith('Arrow')) {
    e.preventDefault()
    filesBrowser.selectDirection(e.code.slice('Arrow'.length).toLowerCase())
  }
}

function onPopState (e) {
  readSelectedPathFromURL()
}

function onSetCurrentSource (node) {
  let path = ''
  if (node._archiveInfo) {
    path += node._archiveInfo.key
    if (node._path) {
      path += node._path
    }
  }
  window.history.pushState('', {}, `beaker://library/${path}`)
}

async function onContextMenu (e) {
  e.preventDefault()
  e.stopPropagation()

  const action = await beaker.browser.showContextMenu([
    {
      type: 'submenu',
      label: 'New archive...',
      submenu: [
        {label: 'Application', id: 'new-application'},
        {label: 'Code module', id: 'new-module'},
        {label: 'Dataset', id: 'new-dataset'},
        {label: 'Documents', id: 'new-documents'},
        {label: 'Music', id: 'new-music'},
        {label: 'Photos', id: 'new-photos'},
        {label: 'Videos', id: 'new-videos'},
        {label: 'Website', id: 'new-website'}
      ]
    }
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
    var node
    var [key, ...pathParts] = window.location.pathname.slice(1).split('/')
    if (!key) {
      // default to user's home
      node = fsRoot.children.find(node => node instanceof FSVirtualFolder_User)
      await filesBrowser.setCurrentSource(node, {suppressEvent: true})
      return
    }

    // try to find a path to the given archive
    var archive = new DatArchive(key)
    var info = await archive.getInfo()

    // start with provenance
    if (info.isOwner && info.userSettings.isSaved) {
      node = fsRoot.children.find(node => node instanceof FSVirtualFolder_User)
      await node.readData()
    } else {
      // check if it's === to or authored by a profile in our network list
      let userNode = fsRoot.children.find(node => (
        node._profile && (
          node._profile._origin === info.url ||
          (info.author && node._profile._origin === info.author.url)
        )
      ))
      if (userNode) {
        node = userNode
        await node.readData()
      } else {
        // use 'Network' and add this archive if it does not exist
        node = fsRoot.children.find(node => node instanceof FSVirtualFolder_Network)
        await node.readData()
        node.addArchive(info)
      }
    }

    // now select the archive
    node = node.children.find(node => node._archiveInfo.key === key)
    await node.readData()

    // now select the folders
    let pathPart
    while ((pathPart = pathParts.shift())) {
      node = node.children.find(node => node.name === pathPart)
      await node.readData()
    }  
    
    await filesBrowser.setCurrentSource(node, {suppressEvent: true})
  } catch (e) {
    // ignore, but log just in case something is buggy
    console.debug(e)
  }
}
