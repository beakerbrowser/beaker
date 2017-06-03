import * as yo from 'yo-yo'
import {Archive} from 'builtin-pages-lib'

var currentFilter = ''
var selectedArchiveKey = ''
var archives
var title = ''
var description = ''
var createdBy

// exported api
// =

window.setup = async function (opts) {
  try {
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
  var helpText = 'Choose an existing Dat archive or create a new one'
  // TODO differernt msg based on createdBy?

  // if (createdBy && !createdBy.startsWith('beaker:')) {
  //   helpText = 'This page wants to ' + helpText.toLowerCase()
  // }

  yo.update(document.querySelector('main'), yo`<main>
    <div class="modal">
      <div class="modal-inner">
        <div class="select-archive-modal">
          <h2 class="title">Select an archive</h2>

          ${renderArchivePicker()}

          <p class="help-text">
            ${helpText}
          </p>

          <form onsubmit=${onSubmit}>
            <label for="title">Title</label>
            <input name="title" tabindex="2" value=${title || ''} placeholder="Title" onchange=${onChangeTitle} />

            <label for="desc">Description</label>
            <textarea name="desc" tabindex="3" placeholder="Description (optional)" onchange=${onChangeDescription}>${description || ''}</textarea>

            <div class="form-actions">
              <button type="button" onclick=${onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
              <button type="submit" class="btn success" tabindex="5">
                TODO
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </main>`)
}

function renderArchivePicker () {
  if (!archives.length) {
    return 'No archives'
  }

  return yo`
    <div class="archive-picker">
      <input onkeyup=${onChangeFilter} id="filter" class="filter" type="text" placeholder="Search..."/>
      <ul class="archives-list">${renderArchivesList()}</ul>
    </div>
  `
}

function renderArchivesList () {
  var filtered = archives.filter(a => (a.title && a.title.toLowerCase().includes(currentFilter)) || (a.description && a.description.toLowerCase().includes(currentFilter)))

  return yo`<ul class="archives-list">${filtered.map(renderArchive)}</ul>`
}

function renderArchive (archive) {
  console.log(archive)
  return yo`
    <li onclick=${onChangeSelectedArchive} data-key=${archive.key}>
      <span class="title">${archive.title}</span>
      <span class="description">${archive.description}</span>
      <span class="path">butt${archive.userSettings.localPath}</span>
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