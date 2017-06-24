import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import * as toast from './toast'
import {niceDate} from '../../lib/time'
import {writeToClipboard} from '../../lib/fg/event-handlers'

// exported api
// =

export default function render (archiveInfo, opts = {}) {
  return yo`
    <div>
      ${rFolder(archiveInfo, opts)}
      ${rFilesList(archiveInfo, opts)}
    </div>
  `
}

function rFilesList (archiveInfo, opts) {
  if (!archiveInfo || !archiveInfo.fileTree.rootNode) {
    return yo`
      <div>
        <div class="files-list"></div>
      </div>
    `
  }

  var hasFiles = Object.keys(archiveInfo.fileTree.rootNode.children).length > 0
  return yo`
    <div class="files-list">
      ${!hasFiles ? yo`<div class="item"><em>Empty folder</em></div>` : ''}
      ${rChildren(archiveInfo, archiveInfo.fileTree.rootNode.children, 0, opts)}
    </div>
  `
}

// rendering
// =

function redraw (archiveInfo, opts={}) {
  yo.update(document.querySelector('.files-list'), rFilesList(archiveInfo, opts))
}

function rFolder (archiveInfo, opts) {
  if (!(archiveInfo.userSettings && archiveInfo.userSettings.localPath)) return ''
  return yo`
    <div class="dat-local-path">
      <span>
        ${archiveInfo.userSettings.localPath}
        <a onclick=${e => onCopyFolder(e, archiveInfo)} href="#" title="Copy path to your clipboard">
          <i class="fa fa-clipboard"></i>
        </a>
      </span>
      <span class="files-list-actions">
        <a onclick=${e => onImportFiles(e, archiveInfo)} href="#" title="Add files to ${archiveInfo.userSettings.localPath}">
          <i class="fa fa-plus"></i>
          Add files
        </a>
        <a onclick=${e => onOpenFolder(e, archiveInfo)} href="#" title="Open ${archiveInfo.userSettings.localPath}">
          <i class="fa fa-folder-open-o"></i>
          Open folder
        </a>
      </span>
    </div>
  `
}

function rChildren (archiveInfo, children, depth=0, opts={}) {
  var children = Object.keys(children)
    .map(key => children[key])
    .filter(node => {
      if (node.entry.name === 'dat.json') {
        // hide dat.json for now
        return false
      }
      return true
    })

  if (children.length === 0 && depth === 0) {
    return yo`
      <div
        class="item empty"
        title="No files">
        <div class="name"><em>No files</em></div>
      </div>
    `
  }

  return children
    .sort(treeSorter)
    .map(node => rNode(archiveInfo, node, depth, opts))
}

function treeSorter (a, b) {
  // directories at top
  if (a.entry.isDirectory() && !b.entry.isDirectory())
    return -1
  if (!a.entry.isDirectory() && b.entry.isDirectory())
    return 1
  // by name
  return a.entry.name.localeCompare(b.entry.name)
}

function rNode (archiveInfo, node, depth, opts) {
  if (node.entry.isDirectory()) {
    return rDirectory(archiveInfo, node, depth, opts)
  }
  if (node.entry.isFile()) {
    return rFile(archiveInfo, node, depth, opts)
  }
  return ''
}

function rDirectory (archiveInfo, node, depth, opts) {
  let icon = 'folder'
  let children = ''
  const directoryPadding = 10 + (depth * 10)

  if (node.isExpanded) {
    children = yo`
      <div class="subtree">
        ${rChildren(archiveInfo, node.children, depth + 1, opts)}
      </div>`
    icon = 'folder-open'
  }

  return yo`
    <div>
      <div
        class="item folder"
        title=${node.niceName}
        onclick=${e => onClickDirectory(e, archiveInfo, node, opts)}
        style=${'padding-left: ' + directoryPadding + 'px'}>
        <div class="name">
          <i class="fa fa-${icon}"></i>${node.niceName}
        </div>
      </div>
      ${children}
    </div>
  `
}

function rFile (archiveInfo, node, depth, opts) {
  const padding = 10 + (depth * 10)

  return yo`
    <div
      class="item file"
      title=${node.niceName}
      style=${'padding-left: ' + padding + 'px'}>
      <div class="name">
        <a href=${join(archiveInfo.url, node.entry.name)}><i class="fa fa-file-text-o"></i>${node.niceName}</a>
      </div>
      <div class="size">${prettyBytes(node.entry.size)}</div>
      ${!opts.hideDate ? yo`<div class="updated">${niceDate(+node.entry.mtime)}</div>` : ''}
    </div>
  `
}

// event handlers
// =

async function onClickDirectory (e, archiveInfo, node, opts={}) {
  node.isExpanded = !node.isExpanded
  if (node.isExpanded) {
    await archiveInfo.fileTree.readFolder(node)
  }
  redraw(archiveInfo, opts)
}

function onCopyFolder (e, archiveInfo) {
  e.preventDefault()
  if (archiveInfo.userSettings.localPath) {
    var path = archiveInfo.userSettings.localPath
    if (path.indexOf(' ') !== -1) {
      path = `"${path}"`
    }
    writeToClipboard(path)
    toast.create(`Folder path copied to clipboard.`)
  }
}

async function onImportFiles (e, archiveInfo) {
  var files = await beakerBrowser.showOpenDialog({
    title: 'Import files to this archive',
    buttonLabel: 'Import',
    properties: ['openFile', 'openDirectory', 'multiSelections', 'createDirectory']
  })
  if (files) {
    files.forEach(src => DatArchive.importFromFilesystem({
      src,
      dst: archiveInfo.url,
      ignore: ['dat.json'],
      inplaceImport: true
    }))
    window.dispatchEvent(new Event('files-added'))
  }
}

function onOpenFolder (e, archiveInfo) {
  e.preventDefault()
  if (archiveInfo.userSettings.localPath) {
    beakerBrowser.openFolder(archiveInfo.userSettings.localPath)
  }
}

// helpers
// =

function join (a, b) {
  if (!a.endsWith('/') && !b.startsWith('/')) {
    return a + '/' + b
  }
  if (a.endsWith('/') && b.startsWith('/')) {
    return a + b.slice(1)
  }
  return a + b
}
