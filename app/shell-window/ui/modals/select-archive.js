/* globals beaker DatArchive */

import * as yo from 'yo-yo'
import {BaseModal} from './base'
import {shortenHash} from '../../../lib/strings'

// exported api
// =

export class SelectArchiveModal extends BaseModal {
  constructor (opts) {
    super(opts)

    this.currentFilter = ''
    this.selectedArchiveKey = ''
    this.archives = null
    this.title = ''
    this.description = ''
    this.type = undefined
    this.buttonLabel = opts.buttonLabel || 'Select'
    this.customTitle = opts.title || ''
    this.currentView = 'archivePicker'
    this.isFormDisabled = true
    this.archives = []

    this.setup(opts.filters)
  }

  async setup (filters) {
    // fetch archives
    this.archives = await beaker.archives.list({
      isSaved: true,
      isOwner: (filters && filters.isOwner),
      type: (filters && filters.type)
    })
    this.type = filters && filters.type
    this.archives.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    this.rerender()
  }

  // rendering
  // =

  render () {
    return yo`
      <div class="select-archive-modal">
        ${this.renderActiveViewContent()}
      </div>`
  }

  renderActiveViewContent () {
    if (this.currentView === 'archivePicker') return this.renderSelectArchiveForm()
    else if (this.currentView === 'newArchive') return this.renderNewArchiveForm()
  }

  renderNewArchiveForm () {
    return yo`
      <form onsubmit=${e => this.onSubmit(e)}>
        <h1 class="title">${this.customTitle || 'Select an archive'}</h1>
        <div class="view create-archive">
          <label for="title">Title</label>
          <input autofocus name="title" tabindex="2" value=${this.title || ''} placeholder="Title" onchange=${e => this.onChangeTitle(e)} />

          <label for="desc">Description</label>
          <textarea name="desc" tabindex="3" placeholder="Description (optional)" onchange=${e => this.onChangeDescription(e)}>${this.description || ''}</textarea>
        </div>

        <div class="form-actions">
          <div class="left">
            <button type="button" onclick=${e => this.onUpdateActiveView(e)} data-content="archivePicker" class="btn">
              <i class="fa fa-caret-left"></i> Back
            </button>
          </div>
          <div class="right">
            <button type="button" onclick=${e => this.onClickCancel(e)} class="btn cancel" tabindex="4">Cancel</button>
            <button type="submit" class="btn" tabindex="5">
              Create
            </button>
          </div>
        </div>
      </form>`
  }

  renderSelectArchiveForm () {
    return yo`
      <form onsubmit=${e => this.onSubmit(e)}>
        <h1 class="title">${this.customTitle || 'Select an archive'}</h1>

        ${this.renderArchivePicker()}

        <div class="form-actions">
          <div class="left">
            <button type="button" onclick=${e => this.onUpdateActiveView(e)} data-content="newArchive" class="btn">
              Create new archive
            </button>
          </div>
          <div class="right">
            <button type="button" onclick=${e => this.onClickCancel(e)} class="btn cancel" tabindex="4">Cancel</button>
            <button disabled=${this.isFormDisabled ? 'disabled' : 'false'} type="submit" class="btn" tabindex="5">
              ${this.buttonLabel}
            </button>
          </div>
        </div>
      </form>`
  }

  renderArchivePicker () {
    if (!this.archives.length) {
      return 'No archives'
    }

    return yo`
      <div class="view archive-picker">
        <div class="filter-container">
          <i class="fa fa-search"></i>
          <input autofocus onkeyup=${e => this.onChangeFilter(e)} id="filter" class="filter" type="text" placeholder="Search"/>
        </div>
        ${this.renderArchivesList()}
      </div>
    `
  }

  renderArchivesList () {
    var filtered = this.archives
    if (this.currentFilter) {
      filtered = filtered.filter(a => a.title && a.title.toLowerCase().includes(this.currentFilter))
    }

    return yo`<ul class="archives-list">${filtered.map(a => this.renderArchive(a))}</ul>`
  }

  renderArchive (archive) {
    var isSelected = this.selectedArchiveKey === archive.key
    return yo`
      <li
        class="archive ${isSelected ? 'selected' : ''}"
        onclick=${e => this.onChangeSelectedArchive(e)}
        ondblclick=${e => this.onDblClickArchive(e)}
        data-key=${archive.key}
      >
        <div class="info">
          <img class="favicon" src="beaker-favicon:${archive.url}" />

          <span class="title" title="${archive.title} ${archive.isOwner ? '' : '(Read-only)'}">
            ${archive.title || 'Untitled'}
          </span>

          ${archive.isOwner ? '' : yo`<span class="readonly">read-only</span>`}

          <span class="hash">${shortenHash(archive.url)}</span>
        </div>
      </li>
    `
  }

  // event handlers
  // =

  onChangeTitle (e) {
    this.selectedArchiveKey = ''
    this.title = e.target.value
  }

  onChangeDescription (e) {
    this.selectedArchiveKey = ''
    this.description = e.target.value
  }

  onClickCancel (e) {
    e.preventDefault()
    this.close(new Error('Canceled'))
  }

  onChangeFilter (e) {
    this.currentFilter = e.target.value.toLowerCase()
    this.rerender()
  }

  onChangeSelectedArchive (e) {
    this.isFormDisabled = false
    this.selectedArchiveKey = e.currentTarget.dataset.key
    this.rerender()
  }

  onDblClickArchive (e) {
    e.preventDefault()
    this.selectedArchiveKey = e.currentTarget.dataset.key
    this.onSubmit()
  }

  onUpdateActiveView (e) {
    this.currentView = e.target.dataset.content
    this.rerender()
  }

  async onSubmit (e) {
    if (e) e.preventDefault()
    if (!this.selectedArchiveKey) {
      try {
        var newArchive = await DatArchive.create({
          title: this.title,
          description: this.description,
          type: this.type,
          prompt: false
        })
        this.close(null, {url: newArchive.url})
      } catch (e) {
        this.close(e.message || e.toString())
      }
    } else {
      this.close(null, {url: `dat://${this.selectedArchiveKey}/`})
    }
  }
}
