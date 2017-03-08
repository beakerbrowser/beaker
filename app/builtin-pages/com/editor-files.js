import yo from 'yo-yo'

// globals
// =

var lastClicked = false

// exported api
// =

export default function rFileTree (archive, currentPath) {
  return yo`
    <div class="filetree">
      ${rChildren(archive, archive.fileTree.rootNode.children)}
    </div>
  `
}

// renderers
// =

function redraw (archive) {
  yo.update(document.querySelector('.filetree'), rFileTree(archive))
}

function rChildren (archive, children, depth=0) {
  return Object.keys(children)
    .map(key => children[key])
    .sort(treeSorter)
    .map(node => rNode(archive, node, depth))
}

function treeSorter (a, b) {
  // directories at top
  if (a.entry.type == 'directory' && b.entry.type != 'directory')
    return -1
  if (a.entry.type != 'directory' && b.entry.type == 'directory')
    return 1
  // by name
  return a.entry.name.localeCompare(b.entry.name)
}

function rNode (archive, node, depth) {
  if (node.entry.type === 'directory') {
    return rDirectory(archive, node, depth)
  }
  if (node.entry.type === 'file') {
    return rFile(archive, node, depth)
  }
  return ''
}

function rDirectory (archive, node, depth) {
  let icon = 'right'
  let children = ''
  const directoryPadding = 10 + (depth * 10)

  const cls = isSelected(archive, node) ? 'selected' : ''

  if (node.isExpanded) {
    children = yo`
      <div class="subtree">
        ${rChildren(archive, node.children, depth + 1)}
      </div>`
    icon = 'down'
  }

  return yo`
    <div>
      <div
        class="item folder ${cls}"
        title=${node.niceName}
        onclick=${e => onClickDirectory(e, archive, node)}
        style=${'padding-left: ' + directoryPadding + 'px'}>
        <i class="fa fa-caret-${icon}"></i>
        ${node.niceName}
      </div>
      ${children}
    </div>
  `
}

function rFile (archive, node, depth) {
  const cls = isSelected(archive, node) ? 'selected' : ''
  const isChanged = archive.dirtyFiles[normalizePath(node.entry.name)] ? '*' : ''
  const padding = depth === 0 ? 20 : 25 + (depth * 5);

  return yo`
    <div
      class="item file ${cls}"
      title=${node.niceName}
      onclick=${e => onClickFile(e, archive, node)}
      style=${'padding-left: ' + padding + 'px'}>
      ${node.niceName}${isChanged}
    </div>
  `
}

function isSelected (archive, node) {
  if (lastClicked) {
    return (lastClicked === node.entry.name)
  }
  if (!archive.activeModel) return false
  return (archive.activeModel.path === normalizePath(node.entry.name))
}

// event handlers
// =

function onClickDirectory (e, archive, node) {
  // toggle expanded
  node.isExpanded = !node.isExpanded
  lastClicked = node.entry.name
  redraw(archive)
}

function onClickFile (e, archive, node) {
  lastClicked = node.entry.name
  var evt = new Event('open-file')
  evt.detail = { path: node.entry.name, node }
  window.dispatchEvent(evt)
}

function normalizePath (path) {
  if (path.startsWith('/')) return path.slice(1)
  return path
}