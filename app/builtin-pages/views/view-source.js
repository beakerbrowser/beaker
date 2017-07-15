/* globals Event DatArchive beakerBrowser */

import * as yo from 'yo-yo'
import {FileTree} from 'builtin-pages-lib'
import mime from 'mime'
import renderFiles from '../com/files-list'

// HACK FIX
// the good folk of whatwg didnt think to include an event for pushState(), so let's add one
// -prf
var _wr = function (type) {
  var orig = window.history[type]
  return function () {
    var rv = orig.apply(this, arguments)
    var e = new Event(type.toLowerCase())
    e.arguments = arguments
    window.dispatchEvent(e)
    return rv
  }
}
window.history.pushState = _wr('pushState')
window.history.replaceState = _wr('replaceState')

// globals
// =

var archiveKey = ''
var fileTree = ''
var archive
var filePath = ''
var fileContent = ''
var pathInfo

setup()
async function setup () {
  update()

  pathInfo = await parseURL()
  if (pathInfo.type === 'dat') {
    filePath = pathInfo.path
    archiveKey = pathInfo.key
    archive = new DatArchive(archiveKey)
    fileTree = new FileTree(archive, {onDemand: true})
    await fileTree.setup().catch(err => null)
  } else {
    filePath = pathInfo.path
  }
  update()
  await loadFile()

  window.addEventListener('pushstate', loadFile)
  window.addEventListener('popstate', loadFile)
}

async function loadFile () {
  fileContent = ''

  pathInfo = await parseURL()
  filePath = pathInfo.path

  var mimetype = mime.lookup(filePath)
  if (/^(video|audio|image)/.test(mimetype) == false) {
    if (pathInfo.type === 'dat') {
      try {
        fileContent = await archive.readFile(filePath, 'utf8')
      } catch (e) {
        console.warn(e)
      }
    } else {
      try {
        fileContent = await beakerBrowser.fetchBody(filePath.slice(1))
      } catch (err) {
        console.error(err)
      }
    }
  }
  update()
}

async function parseURL () {
  var path = window.location.pathname
  if (path === '/' || !path) {
    throw new Error('Invalid URL')
  }

  if (path.startsWith('/http')) {
    return {type: 'http', path: window.location.pathname}
  }

  try {
    // extract key from url
    var parts = /^\/([^/]+)(.*)/.exec(path)
    var key = parts[1]
    path = parts[2]
    if (/[0-9a-f]{64}/i.test(key) == false) {
      key = await DatArchive.resolveName(key)
    }
    return {type: 'dat', key, path}
  } catch (e) {
    console.error('Failed to parse URL', e)
    throw new Error('Invalid dat URL')
  }
}

// rendering
// =

function update () {
  if (pathInfo && pathInfo.type === 'dat') {
    if (!archive) {
      yo.update(document.querySelector('main'), yo`<main>Loading...</main>`)
    } else {
      yo.update(document.querySelector('main'), yo`
        <main>
          <div class="sidebar">
            <div onclick=${onClickFilesList}>
              ${renderFiles({url: archive.url, fileTree})}
            </div>
            <div class="sidebar-footer">
              <div><a href="beaker://library/${archiveKey}">View in Library</a></div>
              <div><a href="dat://${archiveKey}">View site</a></div>
            </div>
          </div>
          ${renderFile()}
        </main>
      `)
    }
  } else {
    if (!fileContent) {
      yo.update(document.querySelector('main'), yo`<main>Loading...</main>`)
    } else {
      yo.update(document.querySelector('main'), yo`
        <main>
          ${renderFile()}
        </main>
      `)
    }
  }
}

function renderFile () {
  var url = filePath
  var mimetype = mime.lookup(filePath)

  if (pathInfo.type === 'dat') {
    url = archive.url + filePath

    if (!archive) {
      return yo`
        <div class="file-view empty">
          <i class="fa fa-code"></i>
        </div>
      `
    }
  }

  url += '?cache-buster=' + Date.now()

  if (mimetype.startsWith('image/')) {
    return yo`
      <div class="file-view">
        <img src=${url} />
      </div>
    `
  } else if (mimetype.startsWith('video/')) {
    return yo`
      <div class="file-view">
        <video controls src=${url}></video>
      </div>
    `
  } else if (mimetype.startsWith('audio/')) {
    return yo`
      <div class="file-view">
        <audio controls src=${url}></audio>
      </div>
    `
  } else if (mimetype === 'application/pdf') {
    return yo`
      <div class="file-view" style="padding: 1rem">
        <a class="link" href=${url}>PDF (click to open)</a>
      </div>
    `
  } else {
    return yo`
      <div class="file-view">
        <textarea readonly>${fileContent}</textarea>
      </div>
    `
  }
}

// event handlers
// =

function onClickFilesList (e) {
  e.preventDefault()
  var node = e.target
  if (node.tagName !== 'A') {
    node = node.querySelector('a')
  }
  var href = node && node.getAttribute('href')
  if (href && href.startsWith('dat://')) {
    window.history.pushState(null, '', 'beaker://view-source/' + href.slice('dat://'.length))
  }
}
