import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {FileTree, ArchivesList} from 'builtin-pages-lib'
import renderTabs from '../com/tabs'
import renderGraph from '../com/peer-history-graph'
import renderFiles from '../com/files-list'
import { makeSafe } from '../../lib/strings'
import { niceDate } from '../../lib/time'
import { writeToClipboard } from '../../lib/fg/event-handlers'

// globals
// =

var currentSection = 'files'
var archiveKey
var archive
var archiveInfo
var page
var isDatSaved

setup ()

async function setup () {
  archiveKey = await parseURLKey()

  if (archiveKey) {
    archive = new DatArchive(archiveKey)
    archiveInfo = await archive.getInfo()

    // load the filetree from the last published, not from the staging
    var aLastPublish = new DatArchive(`${archiveKey}+${archiveInfo.version}`)
    var fileTree = new FileTree(aLastPublish, {onDemand: true})

    // fetch all data
    var [history, fileTreeRes] = await Promise.all([
      archive.history({end: 20, reverse: true, timeout: 10e3}),
      fileTree.setup().catch(err => null)
    ])
    archiveInfo.history = history
    archiveInfo.historyPaginationOffset = 20
    archiveInfo.fileTree = fileTree
    archiveInfo.events = archive.createFileActivityStream()
  }

  render()
}

async function parseURLKey () {
  return window.location.pathname.slice(1, window.location.pathname.length)
}

export function render () {
  var toggleSaveIcon, toggleSaveText
  if (archiveInfo.userSettings.isSaved) {
    toggleSaveIcon = 'fa-trash'
    toggleSaveText = 'Remove from library'
  } else {
    toggleSaveIcon = 'fa-floppy-o'
    toggleSaveText = 'Save to library'
  }

  yo.update(document.querySelector('main'), yo`
    <main>
    <div class="archive">
      <section class="info">
        <h1 class="title" title=${archiveInfo.title}>
          ${niceName(archiveInfo)}
          ${archiveInfo.isOwner ? '' : yo`<i class="readonly fa fa-eye"></i>`}
        </h1>
        <p class="description">${niceDesc(archiveInfo)}</p>
        <div class="actions">
          <button class="btn" onclick=${onToggleSaved}>
            <i class="fa ${toggleSaveIcon}"></i>
            ${toggleSaveText}
          </button>

          <button class="btn" onclick=${onCopyURL(archiveInfo.url)}>
            <i class="fa fa-clipboard"></i>
            Copy URL
          </button>
        </div>
      </section>

      <section class="peer-history">
      <h2>Network activity</h2>
        ${renderGraph(archiveInfo)}
      </section>

      <section class="tabs-content">
        ${renderTabs(currentSection, [
          {id: 'files', label: 'Published files', onclick: onClickTab('files')},
          {id: 'log', label: 'History', onclick: onClickTab('log')},
          {id: 'metadata', label: 'Metadata', onclick: onClickTab('metadata')}
        ].filter(Boolean))}
        ${({
          files: () => renderFiles(archiveInfo),
          log: () => rHistory(archiveInfo),
          metadata: () => rMetadata(archiveInfo),
        })[currentSection]()}
      </section>
    </div>
    </main>
  `)
}

function rHistory (archiveInfo) {
  var rows = archiveInfo.history.map(function (item, i) {
    var rev = item.version
    var revType = makeSafe(item.type)
    var urlRev = (revType === 'put') ? rev : (rev - 1)  // give the one revision prior for deletions
    revType = revType === 'put' ? 'added' : 'deleted'

    return `
      <div class="history-item">
        <div class="date">
          <a class="link" href=${`dat://${archiveInfo.key}+${rev}`} target="_blank">
          Revision ${rev}</a>
        </div>
        ${revType}
        <a class="path" href="${`dat://${archiveInfo.key}+${urlRev}${item.path}`}" target="_blank">
          ${makeSafe(item.path.slice(1))}
        </a>
      </div>
    `
  })

  if (rows.length === 0) {
    rows.push(`<em>Nothing has been published yet.</em>`)
  }

  var loadMoreBtn = ''
  if (archiveInfo.version > archiveInfo.historyPaginationOffset) {
    loadMoreBtn = yo`<div>
      <a class="link load-more" href="#" onclick=${onLoadMoreHistory}>Load more</a>
    </div>`
  }

  // use innerHTML instead of yo to speed up this render
  var rowEls = yo`<div></div>`
  rowEls.innerHTML = rows.join('')
  return yo`<div class="history">${rowEls}${loadMoreBtn}</div>`
}

function rMetadata (archiveInfo) {
  return yo`
    <div class="metadata">
      <table>
        <tr><td class="label">Files</td><td>${prettyBytes(archiveInfo.stagingSizeLessIgnored)} (${prettyBytes(archiveInfo.stagingSize - archiveInfo.stagingSizeLessIgnored)} ignored)</td></tr>
        <tr><td class="label">History</td><td>${prettyBytes(archiveInfo.metaSize)}</td></tr>
        <tr><td class="label">Updated</td><td>${niceDate(archiveInfo.mtime)}</td></tr>
        <tr><td class="label">URL</td><td title="dat://${archiveInfo.key}">dat://${archiveInfo.key}</td></tr>
        <tr><td class="label">Path</td><td>${archiveInfo.userSettings.localPath || ''}</td></tr>
        <tr><td class="label">Editable</td><td>${archiveInfo.isOwner}</td></tr>
      </table>
    </div>
  `
}

function onClickBtn (e) {
  isSidebarOpen = !isSidebarOpen
  render()
}

async function onToggleSaved (e) {
  // toggle saved
  if (archiveInfo.userSettings.isSaved) {
    await beaker.archives.remove(archiveKey)
    archiveInfo.userSettings.isSaved = false
  } else {
    await beaker.archives.add(archiveKey)
    archiveInfo.userSettings.isSaved = true
  }

  render()
}

function onCopyURL (url) {
  return e => {
    writeToClipboard(url)
  }
}

async function onFork (e) {
  render()

  var page = pages.getActive()
  if (!page || !page.getURL().startsWith('dat://')) {
    return
  }
  var archive = await DatArchive.fork(page.siteInfo.key)
  // TODO
  // page.loadURL('beaker://library/' + archive.url.slice('dat://'.length))
}

function onClickTab (tab) {
  return e => {
    e.preventDefault()
    currentSection = tab
    render()
  }
}

async function onLoadMoreHistory (e) {
  e.preventDefault()

  // read more history
  var a = new DatArchive(selectedArchiveKey)
  var moreHistory = await a.history({
    start: selectedArchive.historyPaginationOffset,
    end: selectedArchive.historyPaginationOffset + 500,
    reverse: true
  })

  // add to tracked history and update
  selectedArchive.history = selectedArchive.history.concat(moreHistory)
  selectedArchive.historyPaginationOffset += 500
  render()
}

// helpers

function niceName (archiveInfo) {
  return (archiveInfo.title || '').trim() || 'Untitled'
}

function niceDesc (archiveInfo) {
  return (archiveInfo.description || '').trim() || yo`<em>No description</em>`
}