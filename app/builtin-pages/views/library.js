/* globals Event beaker DatArchive history beakerBrowser confirm */

import * as yo from 'yo-yo'
import {STANDARD_ARCHIVE_TYPES} from '../../lib/const'
import renderSidebar from '../com/sidebar'
import {
  FSVirtualRoot,
  FSVirtualFolder_User,
  FSVirtualFolder_Network,
  FSVirtualFolder_Rehosting,
  FSVirtualFolder_Saved,
  FSVirtualFolder_Other
} from 'beaker-virtual-fs'
import renderFiles from '../com/files-columns-view'

// globals
// =

var selectedPath = []
var fsRoot = new FSVirtualRoot()

setup()
async function setup () {
  await fsRoot.readData()
  await readSelectedPathFromURL()
  update()
}

// rendering
// =

function update () {
  yo.update(document.querySelector('.library-wrapper'), yo`
    <div class="library-wrapper builtin-wrapper">
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

// helpers
// =

async function readSelectedPathFromURL () {
  try {
    var n = 0
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
    if (info.isOwner) {
      selectedPath.push(fsRoot.children.find(node => node instanceof FSVirtualFolder_User))
      await selectedPath[n].readData()
      n++
    } else {
      selectedPath.push(fsRoot.children.find(node => node instanceof FSVirtualFolder_Network))
      await selectedPath[n].readData()
      n++

      // check if it's === to or authored by a profile in our network list
      let userNode = selectedPath[n - 1].children.find(node => (
        node._profile && (
          node._profile._origin === info.url ||
          (info.author && node._profile._origin === info.author.url)
        )
      ))
      if (userNode) {
        selectedPath.push(userNode)
        await selectedPath[n].readData()
        n++
      } else if (info.userSettings.isSaved) {
        if (info.userSettings.networked) {
          selectedPath.push(selectedPath[n - 1].children.find(node => node instanceof FSVirtualFolder_Rehosting))
        } else {
          selectedPath.push(selectedPath[n - 1].children.find(node => node instanceof FSVirtualFolder_Saved))          
        }
        await selectedPath[n].readData()
        n++
      } else {
        // use 'Other' and add this archive if it does not exist
        selectedPath.push(selectedPath[n - 1].children.find(node => node instanceof FSVirtualFolder_Other))
        await selectedPath[n].readData()
        selectedPath[n].addArchive(info)
        n++
      }
    }

    // next, choose type
    var type = findStandardType(info.type)
    if (type) {
      selectedPath.push(selectedPath[n - 1].children.find(node => node._type === type))
    } else {
      selectedPath.push(selectedPath[n - 1].children[0])
    }
    await selectedPath[n].readData()
    n++

    // now select the archive
    selectedPath.push(selectedPath[n - 1].children.find(node => node._archiveInfo.key === key))
    await selectedPath[n].readData()
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