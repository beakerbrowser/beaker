import * as yo from 'yo-yo'
import {FileTree} from 'builtin-pages-lib'
import mime from 'mime'
import renderFiles from '../com/files-list'

// HACK FIX
// the good folk of whatwg didnt think to include an event for pushState(), so let's add one
// -prf
var _wr = function(type) {
  var orig = window.history[type];
  return function() {
    var rv = orig.apply(this, arguments);
    var e = new Event(type.toLowerCase());
    e.arguments = arguments;
    window.dispatchEvent(e);
    return rv;
  };
};
window.history.pushState = _wr('pushState')
window.history.replaceState = _wr('replaceState')

// globals
// =

var archiveKey = ''
var fileTree = ''
var archive
var filePath
var fileContent = ''

setup()
async function setup () {
  update()
  ;[archiveKey, filePath] = await parseURL()
  archive = new DatArchive(archiveKey)
  fileTree = new FileTree(archive, {onDemand: true})
  await fileTree.setup().catch(err => null)
  update()
  await loadFile()

  window.addEventListener('pushstate', loadFile)
  window.addEventListener('popstate', loadFile)
}

async function loadFile () {
  fileContent = ''
  ;[archiveKey, filePath] = await parseURL()
  var mimetype = mime.lookup(filePath)
  if (/^(video|audio|image)/.test(mimetype) == false) {
    try {
      fileContent = await archive.readFile(filePath, 'utf8')
    } catch (e) {
      console.warn(e)
    }
  }
  update()
}

async function parseURL () {
  var path = window.location.pathname
  if (path === '/' || !path) {
    throw new Error('Invalid dat URL')
  }
  try {
    // extract key from url
    var [_, key, path] = /^\/([^\/]+)(.*)/.exec(path)
    if (/[0-9a-f]{64}/i.test(key) == false) {
      key = await DatArchive.resolveName(key)
    }
    return [key, path]
  } catch (e) {
    console.error('Failed to parse URL', e)
    throw new Error('Invalid dat URL')
  }
}

// rendering
// =

function update () {
  if (!archive) {
    yo.update(document.querySelector('main'), yo`<main>Loading...</main>`)
    return
  }
  
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

function renderFile () {
  var url = archive.url + filePath
  var mimetype = mime.lookup(url)
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
  var href = e.target.getAttribute('href')
  if (href && href.startsWith('dat://')) {
    window.history.pushState(null, '', 'beaker://view-source/' + href.slice('dat://'.length))
  }
}