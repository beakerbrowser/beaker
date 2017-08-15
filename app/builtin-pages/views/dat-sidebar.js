/* globals beaker locationbar DatArchive confirm beakerBrowser alert */

import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {ProgressMonitor, FileTree} from 'builtin-pages-lib'
import parseDatURL from 'parse-dat-url'
import renderTabs from '../com/tabs'
import renderFiles from '../com/files-list'
import toggleable, {closeAllToggleables} from '../com/toggleable'
import { makeSafe } from '../../lib/strings'
import { niceDate } from '../../lib/time'
import { throttle } from '../../lib/functions'

// globals
// =

var currentSection = 'files'
var origin = false
var archiveKey
var archive
var archiveInfo
var downloadProgress

setup()

async function setup () {
  try {
    await parseURL()

    // open anchor links in the main webview
    document.addEventListener('click', (e) => {
      var href = e.target.href || e.currentTarget.href
      if (href) {
        e.preventDefault()
        locationbar.openUrl(href, {newTab: !!e.metaKey})
      }
    })

    // listen for changes to the archive
    beaker.archives.addEventListener('updated', onArchivesUpdated)

    // load and render
    await loadCurrentArchive()
  } catch (e) {
    console.error('Failed to load archive', e)
    let err = 'Failed to load the archive'
    if (e.name === 'TimeoutError') {
      err = 'Archive not found'
    }
    yo.update(document.querySelector('main'), yo`
      <main>
        <div class="message error">
          <i class="fa fa-exclamation-triangle"></i> ${err}
        </div>
      </main>
    `)
  }
}

async function loadCurrentArchive () {
  update()
  if (archiveKey) {
    archive = new DatArchive(archiveKey)
    archiveInfo = await archive.getInfo()

    // load the filetree from the last published, not from the staging
    var aLastPublish = new DatArchive(`dat://${archiveKey}+${archiveInfo.version}`)
    var fileTree = new FileTree(aLastPublish, {onDemand: true})

    // fetch all data
    var [history] = await Promise.all([
      archive.history({end: 20, reverse: true, timeout: 10e3}),
      fileTree.setup().catch(err => null)
    ])
    archiveInfo.history = history
    archiveInfo.historyPaginationOffset = 20
    archiveInfo.fileTree = fileTree
    archiveInfo.events = archive.createFileActivityStream()

    // wire up events
    archiveInfo.events.addEventListener('changed', onFileChanged)
    updateProgressMonitor()
  }
  update()
}

async function updateProgressMonitor () {
  // saved readonly?
  const settings = archiveInfo.userSettings
  if (!archiveInfo.isOwner && settings.isSaved && settings.autoDownload) {
    // create if needed
    if (!downloadProgress) {
      let p = new ProgressMonitor(archive)
      await p.setup()
      p.addEventListener('changed', updateDownloadProgress)
      downloadProgress = p
    }
  } else {
    destroyDownloadProgress()
  }
  update()
}

function destroyDownloadProgress () {
  if (downloadProgress) {
    downloadProgress.destroy()
    downloadProgress = null
  }
}

async function onFileChanged () {
  update()
}

async function parseURL () {
  var url = window.location.pathname.slice(1, window.location.pathname.length)
  if (!url) {
    return
  }

  try {
    var urlp = parseDatURL(url)
    origin = urlp.origin
    if (urlp.protocol === 'dat:') {
      archiveKey = await DatArchive.resolveName(urlp.hostname)
    }
  } catch (e) {
    console.warn(e)
  }
}

function update () {
  if (!archiveKey) {
    return updateNonArchive()
  }

  if (!archiveInfo) {
    yo.update(document.querySelector('main'), yo`
      <main><div class="spinner"></div></main>
    `)
    return
  }

  var buttons
  if (archiveInfo.isOwner) {
    buttons = [
      yo`
        <button onclick=${onImportFiles} class="action">
          <div class="content">
            <i class="fa fa-plus"></i>
            <span>Import files</span>
          </div>
        </button>
      `
    ]
  } else {
    buttons = rSyncButton()
  }

  yo.update(document.querySelector('main'), yo`
    <main>
    <div class="archive">
      <section class="actions">
        ${buttons}
        ${toggleable(yo`
          <div class="action dropdown-btn-container toggleable-container">
            <button class="toggleable">
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
              <div onclick=${onFork} class="dropdown-item">
                <i class="fa fa-code-fork"></i>
                Fork
              </div>
              <a class="dropdown-item" onclick=${onDownloadZip}>
                <i class="fa fa-file-archive-o"></i>
                Download as .zip
              </a>
              ${archiveInfo.isOwner ? rSaveButton(archiveInfo) : ''}
            </div>
          </div>
        `)}
      </section>

      ${rDownloadProgress()}

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
        <a href="beaker://swarm-debugger/${archiveInfo.key}">
          <i class="fa fa-bug"></i>
          Network debugger
        </a>
      </section>

      <section class="tabs-content">
        ${renderTabs(currentSection, [
          {id: 'files', label: 'Files', onclick: onClickTab('files')},
          {id: 'log', label: 'History', onclick: onClickTab('log')},
          {id: 'settings', label: 'Settings', onclick: onClickTab('settings')}
        ].filter(Boolean))}
        ${({
          files: () => renderFiles(archiveInfo, {hideDate: true, baseUrl: origin}),
          log: () => rHistory(archiveInfo),
          settings: () => rSettings(archiveInfo)
        })[currentSection]()}
      </section>
    </div>
    </main>
  `)
}

function updateNonArchive () {
  yo.update(document.querySelector('main'), yo`
    <main>
      <div class="info http">
        <h1>${origin || ''}</h1>
        <p>Not a peer-to-peer Website.</p>
      </div>
    </main>
  `)
}

function updateDownloadProgress () {
  yo.update(document.querySelector('#sync-btn'), rSyncButton())
  yo.update(document.querySelector('.progress'), rDownloadProgress())
}

function rSaveButton () {
  var toggleSaveIcon, toggleSaveText

  if (archiveInfo.userSettings.isSaved) {
    toggleSaveIcon = 'fa-trash'
    toggleSaveText = 'Delete'
  } else {
    toggleSaveIcon = 'fa-floppy-o'
    toggleSaveText = 'Restore'
  }
  return yo`
    <button class="dropdown-item" onclick=${onToggleSaved}>
      <i class="fa ${toggleSaveIcon}"></i>
      <span>${toggleSaveText}</span>
    </button>
  `
}

function rSyncButton () {
  var saveIcon, saveLabel
  if (downloadProgress && downloadProgress.current < 100) {
    saveIcon = yo`<span class="spinner"></span>`
  } else if (archiveInfo.userSettings.isSaved) {
    saveIcon = yo`<i class="fa fa-check-circle"></i>`
  } else {
    saveIcon = yo`<i class="fa fa-plus"></i>`
  }
  if (archiveInfo.userSettings.isSaved) {
    saveLabel = 'Added to library'
  } else {
    saveLabel = 'Add to library'
  }
  return yo`
    ${toggleable(yo`
      <div id="sync-btn" class="action sync dropdown-btn-container toggleable-container" title=${saveLabel}>
        <button class="toggleable">
          <div class="content">
            ${saveIcon}
            <span>${saveLabel}</span>
          </div>
        </button>

        <div class="dropdown-btn-list">
          <div class="dropdown-item" onclick=${onClickLocalSync}>
            ${archiveInfo.userSettings.isSaved ? yo`<i class="fa fa-check"></i>` : yo`<i></i>`}
            <i class="fa fa-check-circle"></i>
            Add${archiveInfo.userSettings.isSaved ? 'ed' : ''} to your library
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

function rDownloadProgress () {
  if (!downloadProgress || downloadProgress.current >= 100) {
    return yo`<div class="progress"></div>`
  }
  return yo`
    <div class="progress">
      <progress value=${downloadProgress ? downloadProgress.current : 50} max="100"></progress>
    </div>
  `
}

function rHistory (archiveInfo) {
  var rows = archiveInfo.history.map(function (item, i) {
    var rev = item.version
    var revType = makeSafe(item.type)
    var urlRev = (revType === 'put') ? rev : (rev - 1) // give the one revision prior for deletions
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
      <a class="load-more" onclick=${onLoadMoreHistory}>
        Load more
        <i class="fa fa-caret-down"></i>
      </a>
    </div>`
  }

  // use innerHTML instead of yo to speed up this render
  var rowEls = yo`<div></div>`
  rowEls.innerHTML = rows.join('')
  return yo`<div class="history">${rowEls}${loadMoreBtn}</div>`
}

function rSettings (archiveInfo) {
  var networkSettingsEls
  var toolsEls
  const isSaved = archiveInfo.userSettings.isSaved
  const isChecked = {
    autoDownload: isSaved && archiveInfo.userSettings.autoDownload,
    autoUpload: isSaved && archiveInfo.userSettings.autoDownload
  }
  if (!archiveInfo.isOwner) {
    networkSettingsEls = [
      isSaved
        ? ''
        : yo`
            <p><a onclick=${onToggleSaved} class="link">Add this site to your library</a> to configure the download settings.</p>
          `,
      yo`
        <div class="setting ${!isSaved ? 'disabled' : ''}">
          <h5>Download files</h5>
          <fieldset>
            <label onclick=${(e) => onSetAutoDownload(e, false)}>
              <input type="radio" name="download_setting" disabled=${!isSaved} checked=${!isChecked.autoDownload} />
              When I visit
            </label>
            <label onclick=${(e) => onSetAutoDownload(e, true)}>
              <input type="radio" name="download_setting" disabled=${!isSaved} checked=${isChecked.autoDownload} />
              Always <span class="muted">(Sync for offline use)</span>
            </label>
          </fieldset>
        </div>
      `/*,
      TODO re-enable the upload control when dat supports upload: false -prf
      yo`
        <div class="setting ${!isSaved?'disabled':''}">
          <h5>Upload</h5>
          <fieldset>
            <label>
              <input type="radio" name="upload_setting" disabled=${!isSaved} checked=${!isChecked.autoUpload} />
              When I visit
            </label>
            <label>
              <input type="radio" name="upload_setting" disabled=${!isSaved} checked=${isChecked.autoUpload} />
              Always <span class="muted">(Help host this site)</span>
            </label>
          </fieldset>
        </div>
      ` */
    ]
    toolsEls = yo`
      <div class="tools">
        <a class="link" onclick=${onDeleteDownloadedFiles}><i class="fa fa-trash"></i> Delete downloaded files</a>
      </div>
    `
  }

  return yo`
    <div class="settings">
      ${networkSettingsEls}
      <table>
        <tr><td class="label">Size</td><td>${prettyBytes(archiveInfo.size)}</td></tr>
        <tr><td class="label">Updated</td><td>${niceDate(archiveInfo.mtime || 0)}</td></tr>
      </table>
      ${toolsEls}
    </div>
  `
}

// event handlers
// =

function onArchivesUpdated (e) {
  if (archive && e.details.url === archive.url) {
    loadCurrentArchive()
  }
}

async function onToggleSaved (e) {
  // toggle saved
  if (archiveInfo.userSettings.isSaved) {
    archiveInfo.userSettings = await beaker.archives.remove(archiveKey)
  } else {
    archiveInfo.userSettings = await beaker.archives.add(archiveKey)
  }
  update()
  updateProgressMonitor()
}

async function onSetAutoDownload (e, value) {
  if (archiveInfo.userSettings.autoDownload === value) {
    return
  }
  archiveInfo.userSettings.autoDownload = value
  await beaker.archives.update(archiveKey, null, {autoDownload: value})
  update()
  updateProgressMonitor()
}

async function onImportFiles (e) {
  var files = await beakerBrowser.showOpenDialog({
    title: 'Import files to this archive',
    buttonLabel: 'Import',
    properties: ['openFile', 'openDirectory', 'multiSelections', 'createDirectory']
  })
  if (files) {
    files.forEach(src => DatArchive.importFromFilesystem({
      src,
      dst: archiveInfo.url,
      ignore: ['dat.json'],
      inplaceImport: true
    }))
    update()
  }
}

function onOpenFolder () {
  if (archiveInfo.userSettings.localPath) {
    beakerBrowser.openFolder(archiveInfo.userSettings.localPath)
  }
}

async function onFork (e) {
  update()
  var newArchive = await DatArchive.fork(archiveKey)
  var info = await newArchive.getInfo()
  locationbar.openUrl(`beaker://library/${info.key}`)
}

function onClickTab (tab) {
  return e => {
    e.preventDefault()
    currentSection = tab
    update()
  }
}

function onClickLocalSync () {
  if (!archiveInfo.userSettings.isSaved) onToggleSaved()
}

function onClickOnlineOnly () {
  if (archiveInfo.userSettings.isSaved) onToggleSaved()
}

async function onDeleteDownloadedFiles () {
  if (!confirm('Delete downloaded files? You will be able to redownload them from the p2p network.')) {
    return false
  }
  await beaker.archives.clearFileCache(archiveKey)
  alert('All downloaded files have been deleted.')

  // force a reload of the download progress
  destroyDownloadProgress()
  loadCurrentArchive()
}

async function onDownloadZip () {
  closeAllToggleables()
  beakerBrowser.downloadURL(`dat://${archiveInfo.key}/?download_as=zip`)
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
  update()
}

// helpers

function niceName (archiveInfo) {
  return (archiveInfo.title || '').trim() || 'Untitled'
}

function niceDesc (archiveInfo) {
  return (archiveInfo.description || '').trim() || yo`<em>No description</em>`
}
