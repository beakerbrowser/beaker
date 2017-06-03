import * as yo from 'yo-yo'
import {Archive} from 'builtin-pages-lib'

var currentFilter = ''
var selectedArchiveKey = ''
var archives
var title = ''
var description = ''
var createdBy
var buttonLabel = 'Submit'
var customTitle = ''
var currentTab = 'archivePicker'

// exported api
// =

window.setup = async function (opts) {
  try {
    buttonLabel = opts.buttonLabel || buttonLabel
    customTitle = opts.title || ''
    archives = await beaker.archives.list()
    // render
    createdBy = opts.createdBy || undefined
    render()
  } catch (e) {
    console.error(e)
    // ditch out
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
  selectedArchiveKey = ''
  title = e.target.value
}

function onChangeDescription (e) {
  selectedArchiveKey = ''
  description = e.target.value
}

function onClickCancel (e) {
  e.preventDefault()
  beakerBrowser.closeModal()
}

function onChangeFilter (e) {
  currentFilter = e.target.value.toLowerCase()
  render()
}

function onChangeSelectedArchive (e) {
  selectedArchiveKey = e.currentTarget.dataset.key
  render()
}

function onUpdateActiveTab (e) {
  currentTab = e.target.dataset.content
  render()
}

async function onSubmit (e) {
  e.preventDefault()
  if (!selectedArchiveKey) {
    try {
      var newArchive = await beaker.archives.create({title, description, createdBy})
      beakerBrowser.closeModal(null, {url: newArchive.url})
    } catch (e) {
      beakerBrowser.closeModal({
      name: e.name,
      message: e.message || e.toString(),
      internalError: true
      })
    }
  } else {
    beakerBrowser.closeModal(null, {url: selectedArchiveKey})
  }
}

// internal methods
// =

function render () {
  yo.update(document.querySelector('main'), yo`<main>
    <div class="modal">
      <div class="modal-inner">
        <div class="select-archive-modal">
          <h1 class="title">${customTitle || 'Select an archive'}</h1>

          <p class="help-text">
            Choose an existing Dat archive or create a new one.
          </p>

          <form onsubmit=${onSubmit}>
            <div class="tabs-container">
              <div class="tabs">
                <div onclick=${onUpdateActiveTab} data-content="archivePicker" class="tab ${currentTab === 'archivePicker' ? 'selected' : ''}">
                  Select an archive
                </div>
                <div onclick=${onUpdateActiveTab} data-content="newArchive" class="tab ${currentTab === 'newArchive' ? 'selected' : ''} ">
                  Create new archive
                </div>
              </div>
              ${renderActiveTabContent()}
            </div>

            <div class="form-actions">
              <button type="button" onclick=${onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
              <button type="submit" class="btn primary" tabindex="5">
                ${buttonLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </main>`)
}

function renderActiveTabContent () {
  if (currentTab === 'archivePicker') return renderArchivePicker()
  else if (currentTab === 'newArchive') return renderNewArchiveForm()
}

function renderNewArchiveForm () {
  return yo`
    <div class="tab-content create-archive">
      <label for="title">Title</label>
      <input name="title" tabindex="2" value=${title || ''} placeholder="Title" onchange=${onChangeTitle} />

      <label for="desc">Description</label>
      <textarea name="desc" tabindex="3" placeholder="Description (optional)" onchange=${onChangeDescription}>${description || ''}</textarea>
    </div>

  `
}

function renderArchivePicker () {
  if (!archives.length) {
    return 'No archives'
  }

  return yo`
    <div class="tab-content archive-picker">
      <div class="filter-container">
        <input onkeyup=${onChangeFilter} id="filter" class="filter" type="text" placeholder="Search your archives..."/>
      </div>
      <ul class="archives-list">${renderArchivesList()}</ul>
    </div>
  `
}

function renderArchivesList () {
  var filtered = archives.filter(a => (a.title && a.title.toLowerCase().includes(currentFilter)) || (a.description && a.description.toLowerCase().includes(currentFilter)))

  return yo`<ul class="archivs-list">${filtered.map(renderArchive)}</ul>`
}

function renderArchive (archive) {
  return yo`
    <li class="archive ${archive.key === selectedArchiveKey ? 'selected' : ''}" onclick=${onChangeSelectedArchive} data-key=${archive.key}>
      <div class="info">
        <span class="title">${archive.title || 'Untitled'}</span>
        <span class="path">butt${archive.userSettings.localPath}</span>
      </div>
      <span class="description">${archive.description || yo`<em>No description</em>`}</span>
    </li>
  `
}

function renderArchiveTitle() {
  var t = archive.info.title ? `"${archive.info.title}"` : 'site'
  if (t.length > 100) {
    t = t.slice(0, 96) + '..."'
  }
  return t
}