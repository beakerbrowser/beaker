/* globals beaker beakerBrowser */

import * as yo from 'yo-yo'
import {Archive} from 'builtin-pages-lib'

// state
var archive
var isDownloading = false
var isSelfFork = false
var isProcessing = false
var type
var networked = true

// form variables
var title = ''
var description = ''

// exported api
// =

window.setup = async function (opts) {
  if (!opts.url) {
    // ditch out
    return beakerBrowser.closeModal({
      name: 'Error',
      message: '{url} is required',
      internalError: true
    })
  }

  try {
    // fetch archive info
    archive = new Archive(opts.url)
    await archive.setup('/')

    // listen to archive download progress
    await archive.startMonitoringDownloadProgress()
    archive.progress.addEventListener('changed', render)

    // render
    isSelfFork = opts.isSelfFork
    var archiveInfo = archive ? archive.info : {}
    title = opts.title || archiveInfo.title || ''
    description = opts.description || archiveInfo.description || ''
    type = opts.type
    networked = ('networked' in opts) ? opts.networked : true
    render()

    // select and focus title input
    document.querySelector('input[name="title"]').select()
  } catch (e) {
    console.error(e)
    // ditch out (for harambe)
    return beakerBrowser.closeModal({
      name: e.name,
      message: e.message || e.toString(),
      internalError: true
    })
  }
}

// event handlers
// =

window.addEventListener('keyup', e => {
  if (e.which === 27) {
    beakerBrowser.closeModal()
  }
})

function onChangeTitle (e) {
  title = e.target.value
}

function onChangeDescription (e) {
  description = e.target.value
}

function onClickCancel (e) {
  e.preventDefault()
  beakerBrowser.closeModal()
}

function onClickDownload (e) {
  e.preventDefault()
  archive.download()
  isDownloading = true
  render()
}

async function onSubmit (e) {
  e.preventDefault()
  if (isProcessing) return
  try {
    isProcessing = true
    render()
    var newArchive = await DatArchive.fork(archive.info.key, {title, description, type, networked})
    beakerBrowser.closeModal(null, {url: newArchive.url})
  } catch (e) {
    beakerBrowser.closeModal({
      name: e.name,
      message: e.message || e.toString(),
      internalError: true
    })
  }
}

// internal methods
// =

function render () {
  var isComplete = archive.info.isOwner || archive.progress.isComplete
  var progressEl, downloadBtn
  if (!isComplete) {
    // status/progress of download
    progressEl = yo`<div class="fork-dat-progress">
      ${archive.progress.current > 0
        ? yo`<progress value=${archive.progress.current} max="100"></progress>`
        : ''}
      Some files have not been downloaded, and will be missing from your fork.
    </div>`
    if (!isComplete) {
      downloadBtn = yo`<button type="button" class="btn ${isDownloading ? 'disabled' : 'success'}" onclick=${onClickDownload}>
        ${isDownloading ? '' : 'Finish'} Downloading Files
      </button>`
    }
  } else {
    progressEl = yo`<div class="fork-dat-progress">Ready to fork.</div>`
  }

  var helpText = `Create a copy of ${renderArchiveTitle()} and save it to your library.`
  if (isSelfFork) {
    helpText = 'This archive wants to create a copy of itself.'
  }

  yo.update(document.querySelector('main'), yo`<main>
    <div class="modal">
      <div class="modal-inner">
        <div class="fork-dat-modal">
          <h1 class="title">Fork ${renderArchiveTitle('archive')}</h1>
          <p class="help-text">${helpText}</p>

          <form onsubmit=${onSubmit}>
            <label for="title">Title</label>
            <input name="title" tabindex="2" value=${title} placeholder="Title" onchange=${onChangeTitle} />

            <label for="desc">Description</label>
            <input name="desc" tabindex="3" value=${description} placeholder="Description (optional)" onchange=${onChangeDescription} />

            ${progressEl}
            <div class="form-actions">
              <button type="button" class="btn cancel" onclick=${onClickCancel} tabindex="4" disabled=${isProcessing}>Cancel</button>
              <button type="submit" class="btn ${isComplete ? 'success' : ''}" tabindex="5" disabled=${isProcessing}>
                ${isProcessing
                  ? yo`<span><span class="spinner"></span> Forking...</span>`
                  : `Create fork ${!isComplete ? ' anyway' : ''}`}
              </button>
              ${downloadBtn}
            </div>
          </form>
        </div>
      </div>
    </div>
  </main>`)
}

function renderArchiveTitle (fallback) {
  var t = archive.info.title && `"${archive.info.title}"`
  if (!t && fallback) t = fallback
  if (!t) t = `${archive.info.key.slice(0, 8)}...`
  if (t.length > 100) {
    t = t.slice(0, 96) + '..."'
  }
  return t
}
