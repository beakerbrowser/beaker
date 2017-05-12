import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {niceDate} from '../../lib/time'

// exported api
// =

export default function rFilesList (archiveInfo) {
  if (!archiveInfo || !archiveInfo.fileTree.rootNode) {
    return yo`<div class="files-list"></div>`
  }

  return yo`
    <div class="files-list">
      ${rChildren(archiveInfo, archiveInfo.fileTree.rootNode.children)}
    </div>
  `
}

// rendering
// =

function redraw (archiveInfo) {
  yo.update(document.querySelector('.files-list'), rFilesList(archiveInfo))
}

function rChildren (archiveInfo, children, depth=0) {
  return Object.keys(children)
    .map(key => children[key])
    .sort(treeSorter)
    .map(node => rNode(archiveInfo, node, depth))
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

function rNode (archiveInfo, node, depth) {
  if (node.entry.isDirectory()) {
    return rDirectory(archiveInfo, node, depth)
  }
  if (node.entry.isFile()) {
    return rFile(archiveInfo, node, depth)
  }
  return ''
}

function rDirectory (archiveInfo, node, depth) {
  let icon = 'folder'
  let children = ''
  const directoryPadding = 10 + (depth * 10)

  if (node.isExpanded) {
    children = yo`
      <div class="subtree">
        ${rChildren(archiveInfo, node.children, depth + 1)}
      </div>`
    icon = 'folder-open'
  }

  return yo`
    <div>
      <div
        class="item folder"
        title=${node.niceName}
        onclick=${e => onClickDirectory(e, archiveInfo, node)}>
        <div class="name">
          <a href=${join(archiveInfo.url, node.entry.name)} class="link"><i class="fa fa-${icon}"></i>${node.niceName}</a>
        </div>
      </div>
      ${children}
    </div>
  `
}

function rFile (archiveInfo, node, depth) {
  const padding = 10 + (depth * 10)

  return yo`
    <div
      class="item file"
      title=${node.niceName}
      style=${'padding-left: ' + padding + 'px'}>
      <div class="name">
        <a href=${join(archiveInfo.url, node.entry.name)} class="link"><i class="fa fa-file-text-o"></i>${node.niceName}</a>
      </div>
      <div class="size">${prettyBytes(node.entry.size)}</div>
      <div class="updated">${niceDate(+node.entry.mtime)}</div>
    </div>
  `
}

// event handlers
// =

async function onClickDirectory (e, archiveInfo, node) {
  node.isExpanded = !node.isExpanded
  if (node.isExpanded) {
    await archiveInfo.fileTree.readFolder(node)
  }
  redraw(archiveInfo)
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