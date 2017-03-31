/*
This uses the beaker.bookmarks API, which is exposed by webview-preload to all
sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import ColorThief from '../../lib/fg/color-thief'
import {pluralize} from '../../lib/strings'

const colorThief = new ColorThief()

const LATEST_VERSION = 6001 // semver where major*1mm and minor*1k; thus 3.2.1 = 3002001

// globals
// =

var showReleaseNotes = false
var isManagingBookmarks = false
var isWritingNote = false
var error = false
var userProfile
var archivesStatus
var bookmarks, pinnedBookmarks

setup()
async function setup () {
  await loadBookmarks()
  archivesStatus = await beaker.archives.status()
  userProfile = await beaker.profiles.get(0)
  try {
    userProfile.title = (await beaker.archives.get(userProfile.url)).title
  } catch (e) {
    userProfile.title = 'Your profile'
  }
  update()

  // subscribe to network changes
  beaker.archives.addEventListener('network-changed', ({totalPeers}) => {
    archivesStatus.peers = totalPeers
    update()
  })

  let latestVersion = await beakerSitedata.get('beaker://start', 'latest-version')
  if (+latestVersion < LATEST_VERSION) {
    showReleaseNotes = true
    update()
    beakerSitedata.set('beaker://start', 'latest-version', LATEST_VERSION)
  }
}

// rendering
// =

function update () {
  yo.update(document.querySelector('main'), yo`
    <main>
      ${renderNoteEditor()}
      <header>
        <div class="actions">
          <a onclick=${shareFiles}><i class="fa fa-files-o"></i> Share files</a>
          <a onclick=${shareNote}><i class="fa fa-edit"></i> Share a note</a>
        </div>
        <div style="flex: 1"></div>
        ${renderProfileCard()}
      </header>
      ${renderPinnedBookmarks()}
      ${renderReleaseNotes()}
    </main>
  `)
}

function renderProfileCard () {
  return yo`
    <div class="profile">
      <a class="network" href="beaker://network"><i class="fa fa-share-alt"></i> ${archivesStatus.peers} ${pluralize(archivesStatus.peers, 'peer')}</a>
      <a href=${userProfile.url}>${userProfile.title} <i class="fa fa-user-circle-o"></i></a>
    </div>
  `
}

function renderNoteEditor () {
  if (!isWritingNote) {
    return ''
  }

  return yo`
    <div class="note-editor">
      <form onsubmit=${submitNote}>
        <h2>Write a note</h2>
        <p>
          <input autofocus name="name" type="text" placeholder="Filename including extension..." tabindex="1"/>
        </p>
        <p>
          <textarea name="text" placeholder="What do you want to share?" tabindex="2"></textarea>
        </p>
        ${renderError()}
        <p class="actions">
          <button class="btn" type="button" onclick=${cancelNote} tabindex="3">Cancel</button>
          <button class="btn primary" type="submit" tabindex="4">Create public note</button>
        </p>
      </form>
    </div>
  `
}

function renderPinnedBookmarks () {
  var icon = isManagingBookmarks ? 'caret-down' : 'wrench'

  return yo`
    <div class="bookmarks-container">
      <p>
        <a class="add-pin-toggle" onclick=${toggleAddPin}>
          <i class="fa fa-${icon}"></i>
          ${isManagingBookmarks ? 'Close' : 'Manage bookmarks'}
        </a>
      </p>
      <div class="pinned-bookmarks">
        ${pinnedBookmarks.map(renderPinnedBookmark)}
      </div>
      ${renderBookmarks()}
    </div>
  `
}

function renderBookmarks () {
  if (!isManagingBookmarks) {
    return ''
  }

  const isNotPinned = row => !row.pinned

  const renderRow = row =>
    yo`
      <li class="bookmark ll-row">
        <a class="btn bookmark__pin" onclick=${e => pinBookmark(e, row)}>
          <i class="fa fa-thumb-tack"></i> Pin
        </a>
        <a href=${row.url} class="link bookmark__link" title=${row.title} />
          <img class="favicon bookmark__favicon" src=${'beaker-favicon:' + row.url} />
          <span class="title bookmark__title">${row.title}</span>
          <span class="url">${row.url}</span>
        </a>
      </li>`

  const unpinnedBookmarks = bookmarks.filter(isNotPinned)
  return yo`
    <div class="bookmarks">
      ${unpinnedBookmarks.length ? unpinnedBookmarks.map(renderRow) : 'All bookmarks are pinned'}
    </div>
  `
}

function renderPinnedBookmark (bookmark) {
  var { url, title } = bookmark
  var [r, g, b] = bookmark.dominantColor || [255, 255, 255]
  return yo`
    <a class="pinned-bookmark ${isManagingBookmarks ? 'nolink' : ''}" href=${isManagingBookmarks ? '' : url}>
      <div class="favicon-container" style="background: rgb(${r}, ${g}, ${b})">
        ${isManagingBookmarks ? yo`<a class="unpin" onclick=${e => unpinBookmark(e, bookmark)}><i class="fa fa-times"></i></a>` : ''}
        <img src=${'beaker-favicon:' + url} class="favicon"/>
      </div>
      <div class="title">${title}</div>
    </a>
  `
}

function renderReleaseNotes () {
  if (!showReleaseNotes) {
    return ''
  }
  return yo`
    <div class="alert alert__info alert__release-notes">
      <strong>Welcome to Beaker 0.6.1!</strong>
      New start page, Dat-DNS, and an improved bkr command-line.
      <a href="https://github.com/beakerbrowser/beaker/releases/tag/0.6.1">Learn more</a>
    </div>
  `
}

function renderError () {
  if (!error) {
    return ''
  }
  return yo`
    <div class="message error"><i class="fa fa-exclamation-triangle"></i> ${error}</div>
  `
}

// event handlers
// =

async function shareFiles () {
  // have user select file
  var paths = await beakerBrowser.showOpenDialog({
    title: 'Select your files',
    properties: ['openFile', 'openDirectory', 'multiSelections', 'showHiddenFiles']
  })
  if (!paths) {
    return
  }

  // construct the destination folder
  var date = createDateString()
  var dst = `${userProfile.url}/files/${date}/`

  // import into the user profile
  await Promise.all(paths.map(srcPath => 
    DatArchive.importFromFilesystem({srcPath, dst, inplaceImport: true})
  ))

  // open
  window.location = dst
}

function shareNote () {
  isWritingNote = true
  update()
}

function cancelNote () {
  isWritingNote = false
  update()
}

async function submitNote (e) {
  e.preventDefault()
  e.stopPropagation()

  var name = (e.target.name.value || '').trim()
  var text = (e.target.text.value || '').trim()

  name = name || (Date.now() + '.txt')
  var path = `/notes/${name}`

  var archive = new DatArchive(userProfile.url)
  // make sure dir exists
  try { await archive.createDirectory('/notes') }
  catch (e) {}
  // make sure file does not exist
  try {
    await archive.stat(path)
    error = 'A file already exists with this name, please choose another.'
    return update()
  } catch (e) {}
  // write file
  try {
    await archive.writeFile(path, text, 'utf8')
  } catch (e) {
    error = e
    return update()
  }
  window.location = archive.url + path
}

function toggleAddPin (url, title) {
  isManagingBookmarks = !isManagingBookmarks
  update()
}

async function pinBookmark (e, {url}) {
  e.preventDefault()
  e.stopPropagation()

  await beaker.bookmarks.togglePinned(url, true)
  await loadBookmarks()
  update()
}

async function unpinBookmark (e, {url}) {
  e.preventDefault()
  e.stopPropagation()

  await beaker.bookmarks.togglePinned(url, false)
  await loadBookmarks()
  update()
}

// helpers
// =

async function loadBookmarks () {
  bookmarks = (await beaker.bookmarks.list()) || []
  pinnedBookmarks = (await beaker.bookmarks.list({pinned: true})) || []
  
  // load dominant colors of each pinned bookmark
  await Promise.all(pinnedBookmarks.map(attachDominantColor))
}

function attachDominantColor (bookmark) {
  return new Promise(resolve => {
    var img = new Image()
    img.setAttribute('crossOrigin', 'anonymous')
    img.onload = e => {
      var c = colorThief.getColor(img, 10)
      c[0] = (c[0] / 4)|0 + 192
      c[1] = (c[1] / 4)|0 + 192
      c[2] = (c[2] / 4)|0 + 192
      bookmark.dominantColor = c
      resolve()
    }
    img.onerror = resolve
    img.src = 'beaker-favicon:' + bookmark.url
  })
}

function createDateString () {
  var d = new Date()
  return pad0`${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}_${d.getHours()}-${d.getMinutes()}`
}

function pad0 (strings, ...args) {
  var out = ''
  for (var i = 0; i < strings.length; i++) {
    out += strings[i]
    if (args[i]) out += doPad0(args[i])
  }
  return out
}

function doPad0 (str) {
  str = ''+str
  if (str.length < 2) return '0' + str
  return str
}
