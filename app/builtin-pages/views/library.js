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

var selectedPath = []
var fsRoot = new FSVirtualRoot()
var filesBrowser

setup()
async function setup () {
  // load and render
  await fsRoot.readData()
  filesBrowser = new FilesBrowser(fsRoot)
  // await readSelectedPathFromURL() TODO
  update()
  await filesBrowser.setCurrentSource(fsRoot._children[0])
  window.filesBrowser = filesBrowser
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

    // now select the archive
    selectedPath.push(selectedPath[0].children.find(node => node._archiveInfo.key === key))
    await selectedPath[1].readData()
  } catch (e) {
    // ignore, but log just in case something is buggy
    console.debug(e)
  }
}
