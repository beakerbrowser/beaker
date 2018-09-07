/* globals DatArchive */

import * as yo from 'yo-yo'
import {BaseModal} from './base'
import ArchiveProgressMonitor from '../../../lib/fg/archive-progress-monitor'

// exported api
// =

export class ForkArchiveModal extends BaseModal {
  constructor (opts) {
    super(opts)
    this.setup(opts)
  }

  async setup (opts) {
    // fetch archive info
    var archive = this.archive = new DatArchive(opts.url)
    var archiveInfo = this.archiveInfo = await archive.getInfo()

    // setup state
    this.title = opts.title || archiveInfo.title || ''
    this.description = opts.description || archiveInfo.description || ''
    this.type = opts.type
    this.links = opts.links
    this.networked = ('networked' in opts) ? opts.networked : true
    this.isSelfFork = opts.isSelfFork
    this.isProcessing = false
    this.isDownloading = false

    // listen to archive download progress
    this.progress = new ArchiveProgressMonitor(archive)
    this.progress.fetchAllStats().then(() => this.rerender())
    this.progress.on('changed', () => this.rerender())
    this.progress.startListening()
    this.on('close', () => this.progress.stopListening())

    // render
    this.rerender()
  }

  // rendering
  // =

  render () {
    if (!this.archive || !this.archiveInfo) {
      return '' // loading
    }

    var archive = this.archive
    var isComplete = this.archiveInfo.isOwner || this.progress.isComplete
    var progressEl, downloadBtn
    if (!isComplete) {
      // status/progress of download
      progressEl = yo`<div class="fork-dat-progress">
        ${this.progress.current > 0
          ? yo`<progress value=${this.progress.current} max="100"></progress>`
          : ''}
        Some files have not been downloaded, and will be missing from your copy.
      </div>`
      if (!isComplete) {
        downloadBtn = yo`<button type="button" class="btn ${this.isDownloading ? 'disabled' : 'success'}" onclick=${e => this.onClickDownload(e)}>
          ${this.isDownloading ? '' : 'Finish'} Downloading Files
        </button>`
      }
    } else {
      progressEl = yo`<div class="fork-dat-progress">Ready to copy.</div>`
    }

    var helpText = ''
    if (this.isSelfFork) {
      helpText = yo`<p class="help-text">This archive wants to create a copy of itself.</p>`
    }

    return yo`
      <div class="fork-archive-modal">
        <h1 class="title">Make a copy of ${renderArchiveTitle(this.archiveInfo, 'archive')}</h1>
        ${helpText}

        <form onsubmit=${e => this.onSubmit(e)}>
          <label for="title">Title</label>
          <input name="title" tabindex="2" value=${this.title} placeholder="Title" onchange=${e => this.onChangeTitle(e)} />

          <label for="desc">Description</label>
          <textarea name="desc" tabindex="3" placeholder="Description (optional)" onchange=${e => this.onChangeDescription(e)}>${this.description}</textarea>

          ${progressEl}
          <div class="form-actions">
            <button type="button" class="btn cancel" onclick=${e => this.onClickCancel(e)} tabindex="4" disabled=${this.isProcessing}>Cancel</button>
            <button type="submit" class="btn ${isComplete ? 'success' : ''}" tabindex="5" disabled=${this.isProcessing}>
              ${this.isProcessing
                ? yo`<span><span class="spinner"></span> Copying...</span>`
                : `Create copy ${!isComplete ? ' anyway' : ''}`}
            </button>
            ${downloadBtn}
          </div>
        </form>
      </div>`
  }

  // event handlers
  // =

  onChangeTitle (e) {
    this.title = e.target.value
  }

  onChangeDescription (e) {
    this.description = e.target.value
  }

  onClickCancel (e) {
    e.preventDefault()
    this.close(new Error('Canceled'))
  }

  onClickDownload (e) {
    e.preventDefault()
    this.archive.download()
    this.isDownloading = true
    this.rerender()
  }

  async onSubmit (e) {
    e.preventDefault()
    if (this.isProcessing) return
    try {
      this.isProcessing = true
      this.rerender()
      var newArchive = await DatArchive.fork(this.archiveInfo.key, {
        title: this.title,
        description: this.description,
        type: this.type,
        networked: this.networked,
        links: this.links,
        prompt: false
      })
      this.close(null, {url: newArchive.url})
    } catch (e) {
      this.close(e.message || e.toString())
    }
  }
}

// internal methods
// =

function renderArchiveTitle (archiveInfo, fallback) {
  var t = archiveInfo.title && `"${archiveInfo.title}"`
  if (!t && fallback) t = fallback
  if (!t) t = `${archiveInfo.key.slice(0, 8)}...`
  if (t.length > 100) {
    t = t.slice(0, 96) + '..."'
  }
  return t
}
