import co from 'co'

// exported api
// =

export default class ArchiveFiles {
  constructor (archiveInfo) {
    var m = archiveInfo.manifest

    this.archiveKey = archiveInfo.key
    // root node is the archive itself
    this.rootNode = createRootNode(archiveInfo)
    // current node: used by the UI for rendering
    this.currentNode = this.rootNode

    // iterate the list, recurse the path... build the tree!
    archiveInfo.entries.forEach(e => addEntry(this.rootNode, splitPath(e.name), e))
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

    // recurse the tree and tally the blocks, lengths, and download amounts
    descend(this.rootNode)
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
      
      // iterate children
      for (var k in node.children) {
        descend(node.children[k])
      }

      // propagate size and progress to parent
      if (node.parent) {
        node.parent.entry.length += node.entry.length
        node.parent.entry.blocks += node.entry.blocks
        node.parent.entry.downloadedBlocks += node.entry.downloadedBlocks
      }
    }
  }

  setCurrentNodeByPath(names) {
    this.currentNode = this.rootNode
    if (names.length === 0 || names[0] == '')
      return // at root

    // descend to the correct node (or as far as possible)
    for (var i=0; i < names.length; i++) {
      var child = this.currentNode.children[names[i]]
      if (!child || child.entry.type != 'directory')
        return // child dir not found, stop here
      this.currentNode = child
    }
  }

  get progress() {
    let entry = this.rootNode.entry
    return Math.round(entry.downloadedBlocks / entry.blocks * 100)
  }

  download(node) {
    var self = this
    node = node || this.rootNode

    // recursively start downloads
    co(function *() {
      yield startDownload(node)
    })

    function * startDownload (n) {
      // do nothing if already downloaded
      if (n.entry.downloadedBlocks === n.entry.blocks) {
        return Promise.resolve()
      }

      // progress starting
      n.entry.isDownloading = true

      if (n.entry.type === 'file') {
        // download entry
        yield datInternalAPI.downloadArchiveEntry(self.archiveKey, n.entry.path)
      } else if (n.entry.type === 'directory') {
        // recurse to children
        yield Object.keys(n.children).map(k => startDownload(n.children[k]))
      }

      // done
      n.entry.isDownloading = false
      return Promise.resolve()
    }
  }
}

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

function removePrecedingSlash (str) {
  return str.replace(/^\//, '')
}

function splitPath (str) {
  if (!str || typeof str != 'string') return []
  return str
    .replace(/(^\/*)|(\/*$)/g, '') // skip any preceding or following slashes
    .split('/')
}