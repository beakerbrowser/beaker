import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {FileTree, ArchivesList} from 'builtin-pages-lib'
import renderTabs from '../com/tabs'
import renderGraph from '../com/peer-history-graph'
import renderFiles from '../com/files-list'
import toggleable, {closeAllToggleables} from '../com/toggleable'
import { makeSafe } from '../../lib/strings'
import { niceDate } from '../../lib/time'
import { writeToClipboard } from '../../lib/fg/event-handlers'


// globals
// =

var currentSection = 'files'
var hostname = false
var archiveKey
var archive
var archiveInfo
var page
var isDatSaved

setup ()

async function setup () {
  await parseURL()

  // open anchor links in the main webview
  document.addEventListener('click', (e) => {
    var href = e.target.href || e.currentTarget.href
    if (href) {
      e.preventDefault()
      locationbar.openUrl(href, {newTab: !!e.metaKey})
    }
  })

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

async function parseURL () {
  var url = window.location.pathname.slice(1, window.location.pathname.length)
  if (!url) {
    return
  }

  try {
    var urlp = new URL(url)
    hostname = urlp.origin
    if (urlp.protocol === 'dat:') {
      archiveKey = await DatArchive.resolveName(urlp.hostname)
    }
  } catch (e) {
    console.warn(e)
  }
}

function render () {
  if (!archiveKey) {
    return rNonArchive()
  }

  var syncButton
  if (archiveInfo.isOwner) {
    var toggleSaveIcon, toggleSaveText

    if (archiveInfo.userSettings.isSaved) {
      toggleSaveIcon = 'fa-trash'
      toggleSaveText = 'Delete'
    } else {
      toggleSaveIcon = 'fa-floppy-o'
      toggleSaveText = 'Restore'
    }
    syncButton = yo`
      <button class="action" onclick=${onToggleSaved}>
        <div class="content">
          <i class="fa ${toggleSaveIcon}"></i>
          <span>${toggleSaveText}</span>
        </div>
      </button>
    `
  } else {
    var syncIcon, syncTitle

    if (archiveInfo.userSettings.isSaved) {
      syncIcon = 'fa-check-circle'
      syncTitle = 'These files are saved for offline viewing'
    } else {
      syncIcon = 'fa-cloud'
      syncTitle = 'These files are only available online'
    }
    syncButton = yo`
      ${toggleable(yo`
        <div class="action sync dropdown-btn-container toggleable-container" title=${syncTitle}>
          <button class="toggleable">
            <div class="content">
              <i class="fa ${syncIcon}"></i>
              <span>Sync</span>
            </div>
          </button>

          <div id="butt" type="context" class="dropdown-btn-list">
            <div class="dropdown-item" onclick=${onClickLocalSync}>
              ${archiveInfo.userSettings.isSaved ? yo`<i class="fa fa-check"></i>` : yo`<i></i>`}
              <i class="fa fa-check-circle"></i>
              Sync${archiveInfo.userSettings.isSaved ? 'ed' : ''} for offline use
            </div>
            <div class="dropdown-item" onclick=${onClickOnlineOnly}>
              ${!archiveInfo.userSettings.isSaved ? yo`<i class="fa fa-check"></i>` : yo`<i></i>`}
              <i class="fa fa-cloud"></i>
              Online only
            </div>
          </div>
        </div>
      `)}
    `
  }

  yo.update(document.querySelector('main'), yo`
    <main>
    <div class="archive">
      <section class="actions">
        ${syncButton}

        <button class="action" onclick=${onFork}>
          <div class="content">
          <i class="fa fa-code-fork"></i>
          <span>Fork</span>
          </div>
        </button>

        ${toggleable(yo`
          <div class="action dropdown-btn-container toggleable-container">
            <button class="toggleable" onclick>
              <div class="content">
              <i class="fa fa-caret-down"></i>
              <span>More</span>
              </div>
            </button>

            <div class="dropdown-btn-list">
              <a href="beaker://library/${archiveInfo.key}/" class="dropdown-item">
                <i class="fa fa-code"></i>
                Open in Library
              </a>
            </div>
          </div>
        `)}

      </section>

      <section class="info">
        <div class="heading">
          <h1 class="title" title=${archiveInfo.title}>
            ${niceName(archiveInfo)}
            ${archiveInfo.isOwner ? '' : yo`<span class="readonly">Read-only</span>`}
          </h1>
        </div>
        <p class="description">${niceDesc(archiveInfo)}</p>
      </section>
      <section class="network-info">
        <span>
          <i class="fa fa-share-alt"></i>
          ${archiveInfo.peers} peers
        </span>
        <a href="beaker://swarm-debugger/${archiveInfo.key}">
          <i class="fa fa-bug"></i>
          Network debugger
        </a>
      </section>

      <section class="tabs-content">
        ${renderTabs(currentSection, [
          {id: 'files', label: 'Files', onclick: onClickTab('files')},
          {id: 'log', label: 'History', onclick: onClickTab('log')},
          {id: 'metadata', label: 'Metadata', onclick: onClickTab('metadata')}
        ].filter(Boolean))}
        ${({
          files: () => renderFiles(archiveInfo, {hideDate: true}),
          log: () => rHistory(archiveInfo),
          metadata: () => rMetadata(archiveInfo),
        })[currentSection]()}
      </section>
    </div>
    </main>
  `)
}

function rNonArchive () {
  yo.update(document.querySelector('main'), yo`
    <main>
      <div class="info http">
        <h1>${hostname || ''}</h1>
        <p>Not a peer-to-peer Website.</p>
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
      <a class="link load-more" onclick=${onLoadMoreHistory}>Load more</a>
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
        <tr><td class="label">Path</td><td>${archiveInfo.userSettings.localPath || ''}</td></tr>
        <tr><td class="label">Editable</td><td>${archiveInfo.isOwner}</td></tr>
      </table>
    </div>
  `
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

async function onFork (e) {
  render()
  var newArchive = await DatArchive.fork(archiveKey)
  var info = await newArchive.getInfo()
  locationbar.openUrl(`beaker://library/${info.key}`)
}

function onClickTab (tab) {
  return e => {
    e.preventDefault()
    currentSection = tab
    render()
  }
}

function onClickLocalSync () {
  if(!archiveInfo.userSettings.isSaved) onToggleSaved()

}

function onClickOnlineOnly () {
  if (archiveInfo.userSettings.isSaved) onToggleSaved()
}

async function onLoadMoreHistory (e) {
  e.preventDefault()

  // read more history
  var a = new DatArchive(archiveKey)
  var moreHistory = await a.history({
    start: archive.historyPaginationOffset,
    end: archive.historyPaginationOffset + 500,
    reverse: true
  })

  // add to tracked history and update
  archiveInfo.history = archiveInfo.history.concat(moreHistory)
  archiveInfo.historyPaginationOffset += 500
  render()
}

// helpers

function niceName (archiveInfo) {
  return (archiveInfo.title || '').trim() || 'Untitled'
}

function niceDesc (archiveInfo) {
  return (archiveInfo.description || '').trim() || yo`<em>No description</em>`
}