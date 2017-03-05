import yo from 'yo-yo'

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

function rChildren (archive, children) {
  return Object.keys(children)
    .map(key => children[key])
    .sort(treeSorter)
    .map(node => rNode(archive, node))
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

function rNode (archive, node) {
  if (node.entry.type === 'directory') {
    return rDirectory(archive, node)
  }
  if (node.entry.type === 'file') {
    return rFile(archive, node)
  }
  return ''
}

function rDirectory (archive, node) {
  let cls = ''
  let children = ''

  if (node.isExpanded) {
    children = yo`<div class="subtree">${rChildren(archive, node.children)}</div>`
    cls = 'open-'
  }

  return yo`
    <div>
      <div class="item folder" onclick=${e => onClickDirectory(e, archive, node)}>
        <span class="fa fa-folder-${cls}o"></span>${node.niceName}
      </div>
      ${children}
    </div>
  `
}

function rFile (archive, node) {
  const cls = (archive.activeModel && archive.activeModel.path === normalizePath(node.entry.name)) ? 'selected' : ''
  const isChanged = archive.dirtyFiles[node.entry.name] ? '*' : ''
  return yo`
    <div class="item file ${cls}" onclick=${e => onClickFile(e, archive, node)}>${node.niceName}${isChanged}</div>
  `
}

// event handlers
// =

function onClickDirectory (e, archive, node) {
  // toggle expanded
  node.isExpanded = !node.isExpanded
  redraw(archive)
}

function onClickFile (e, archive, node) {
  var evt = new Event('open-file')
  evt.detail = { path: node.entry.name, node }
  window.dispatchEvent(evt)
}

function normalizePath (path) {
  if (path.startsWith('/')) return path.slice(1)
  return path
}