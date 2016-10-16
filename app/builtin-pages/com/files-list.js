import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import toggleable from './toggleable'
import { niceDate } from '../../lib/time'
import { ucfirst, pluralize } from '../../lib/strings'

function createRootNode (archiveInfo) {
  return {
    parent: null,
    entry: {
      type: 'directory',
      name: archiveInfo.title || '/',
      path: '',
      key: archiveInfo.key,
      length: 0,
      blocks: 0,
      downloadedBlocks: 0
    },
    children: {}
  }
}

function createDirectoryNode (name, path, parent) {
  return {
    entry: {
      type: 'directory',
      name,
      path,
      length: 0,
      blocks: 0,
      downloadedBlocks: 0
    },
    parent
  }
}

export function entriesListToTree (archiveInfo) {
  var m = archiveInfo.manifest

  // root node is the archive itself
  var rootNode = createRootNode(archiveInfo)

  // iterate the list, recurse the path... build the tree!
  archiveInfo.entries.forEach(e => addEntry(rootNode, splitPath(e.name), e))
  function addEntry (parent, path, entry) {
    // ignore a "root directory" if present, in favor of the one we created already
    if (!entry.name || entry.name == '/')
      return

    // take a name off the path
    var name = path.shift()

    // add children if needed
    parent.children = parent.children || {}

    if (path.length === 0) {
      // end of path, add entry
      parent.children[name] = parent.children[name] || {} // only create if DNE yet
      parent.children[name].parent = parent
      parent.children[name].entry = entry
      parent.children[name].entry.path = removePrecedingSlash(entry.name)
      parent.children[name].entry.name = name
    } else {
      // an ancestor directory, ensure the dir exists
      parent.children[name] = parent.children[name] || createDirectoryNode(name, parent.entry.path+name+'/', parent)
      // descend
      addEntry(parent.children[name], path, entry)
    }
  }

  return rootNode
}

export function calculateTreeSizeAndProgress (archiveInfo, root) {
  descend(root)

  // recurse the tree and tally the blocks, lengths, and download amounts
  function descend (node) {
    if (node.entry.type == 'directory') {
      // reset numbers
      node.entry.length = 0
      node.entry.blocks = 0
      node.entry.downloadedBlocks = 0
    } else {
      // calculate progress
      node.entry.downloadedBlocks = countDownloadedBlocks(archiveInfo, node.entry)
    }

    // propagate size and progress to parent
    if (node.parent) {
      node.parent.entry.length += node.entry.length
      node.parent.entry.blocks += node.entry.blocks
      node.parent.entry.downloadedBlocks += node.entry.downloadedBlocks
    }

    // iterate children
    for (var k in node.children)
      descend(node.children[k])
  }
}

export function archiveEntries (tree, opts={}) {
  const archiveKey = opts.archiveKey || tree.entry.key
  var numFiles = 0, numHidden = 0

  // helper to render the entries
  function renderNode (node) {
    var els = []
    const entry = node.entry
    var isDotfile = entry.name && (entry.name.charAt(0) == '.' || entry.path == 'dat.json')
    numFiles++

    // hide dotfiles
    if (isDotfile) {
      numHidden++
      if (opts.hideDotfiles) {
        return ''
      }
    }

    // type-specific rendering
    var link
    if (entry.type == 'directory') {
      link = yo`<a class="fl-name-link" href="beaker:archive/${archiveKey}/${entry.path}" title=${entry.name} onclick=${e => opts.onOpenFolder(e, entry)}>${entry.name}</a>`
    } else {
      link = yo`<a class="fl-name-link" href="dat://${archiveKey}/${entry.path}" title=${entry.name}>${entry.name}</a>`
    }

    // download state
    var status, downloadEl
    if (entry.downloadedBlocks == entry.blocks) {
      status = 'downloaded'
    } else if (entry.isDownloading || entry.downloadedBlocs > 0) {
      status = 'downloading'
      var progress = Math.round(entry.downloadedBlocks / entry.blocks * 100)
      downloadEl = yo`<div class="fl-download"><progress value=${progress} max="100"></progress></div>`
    } else {
      status = 'not-downloaded'
    } 

    // render self
    let mtime = entry.mtime ? niceDate(entry.mtime) : ''
    return yo`<div class=${`fl-row ${entry.type} ${(isDotfile?'dotfile':'')} ${status}`}>
      ${downloadEl}
      <div class="fl-name overflower">${link}</div>
      <div class="fl-updated" title=${mtime}>${mtime}</div>
      <div class="fl-size">${prettyBytes(entry.length)}</div>
    </div>`
  }

  // helper to render the 'up' link
  function renderParent () {
    const entry = tree.parent.entry
    return yo`<div class="fl-row updog">
      <div class="fl-name overflower"><a class="fl-name-link" href="beaker:archive/${archiveKey}/${entry.path}" title="Parent directory" onclick=${e => opts.onOpenFolder(e, entry)}>parent</a></div>
      <div class="fl-size"></div>
    </div>`
  }

  // helper to render the footer
  function renderFooter () {
    const entry = tree.entry

    // render
    var hideLabel = opts.hideDotfiles ? 'show' : 'hide'
    var hideToggle = (numHidden > 0) ? yo`<span>, ${numHidden} hidden (<a onclick=${opts.onToggleHidden}>${hideLabel}</a>)</span>` : ''
    return yo`<div class="fl-footer">
      <div class="fl-name overflower">${numFiles} ${pluralize(numFiles, 'file')}${hideToggle}</div>
      <div class="fl-updated"></div>
      <div class="fl-size">${prettyBytes(entry.length)}</div>
    </div>`
  }

  // render
  const toObj = key => tree.children[key]
  var rows = (tree.children)
    ? Object.keys(tree.children).map(toObj).sort(treeSorter).map(child => renderNode(child))
    : []
  if (tree.parent)
    rows.unshift(renderParent())
  return yo`<div class="files-list ${rows.length===0?'empty':''}">
    <div class="fl-rows">${rows}</div>
    ${renderFooter()}
  </div>`
}

function removePrecedingSlash (str) {
  return str.replace(/^\//, '')
}

function splitPath (str) {
  if (!str || typeof str != 'string') return []
  return str
    .replace(/(^\/*)|(\/*$)/g, '') // skip any preceding or following slashes
    .split('/')
}

function treeSorter (a, b) {
  // directories at top
  if (a.entry.type == 'directory' && b.entry.type != 'directory')
    return -1
  if (a.entry.type != 'directory' && b.entry.type == 'directory')
    return 1

  if (a.entry.type != 'directory') {
    // files: downloaded above downloading above not-downloaded
    if ((a.entry.downloadedBlocks == a.entry.blocks) && (b.entry.downloadedBlocks < b.entry.blocks))
      return -1
    if ((a.entry.downloadedBlocks < a.entry.blocks) && (b.entry.downloadedBlocks == b.entry.blocks))
      return 1
    if ((a.entry.downloadedBlocks > 0) && (b.entry.downloadedBlocks == 0))
      return -1
    if ((a.entry.downloadedBlocks == 0) && (b.entry.downloadedBlocks > 0))
      return 1
  }

  // by name
  return a.entry.name.localeCompare(b.entry.name)
}

// helper to detect if the content block is available
function hasBlock (archiveInfo, index) {
  var bit = index & 7
  var byte = (index - bit) / 8
  if (byte >= archiveInfo.contentBitfield.length) return false
  return !!(archiveInfo.contentBitfield[byte] & (128 >> bit))
}

// helper to determine what % an entry is downloaded
function countDownloadedBlocks (archiveInfo, entry) {
  // count # of downloaded blocks
  var downloadedBlocks = 0
  var offset = entry.content.blockOffset
  for (var i=0; i < entry.blocks; i++) {
    if (hasBlock(archiveInfo, i + offset))
      downloadedBlocks++
  }
  return downloadedBlocks
}
