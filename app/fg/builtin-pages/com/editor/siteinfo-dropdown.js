import yo from 'yo-yo'
import _get from 'lodash.get'
import {emit} from '../../../lib/event-handlers'
import toggleable2, {closeAllToggleables}  from '../toggleable2'

// globals
// =

var hasChanges = false

// exported api
// =

export function renderSiteinfoDropdown ({workingDatJson, archiveInfo}) {
  if (archiveInfo.isOwner) {
    return renderSiteinfoDropdownOwner(workingDatJson, archiveInfo)
  }
  return renderSiteinfoDropdownNonowner(workingDatJson, archiveInfo)
}

export function renderSiteinfoDropdownOwner (workingDatJson, archiveInfo) {
  const {title, description} = workingDatJson
  const {canDelete} = archiveInfo
  const {isSaved} = archiveInfo.userSettings
  const onChangeMade = e => {
    hasChanges = true
    document.querySelector('.siteinfo.dropdown .btn.primary').removeAttribute('disabled')
  }
  return toggleable2({
    id: 'site-info-editor',
    closed: ({onToggle}) => yo`
      <div class="dropdown toggleable-container">
        <button class="btn site-info-btn transparent toggleable nofocus" onclick=${onToggle}>${title || 'New site'}</button>
      </div>`,
    open: ({onToggle}) => yo`
      <div class="dropdown siteinfo toggleable-container">
        <button class="btn site-info-btn transparent toggleable nofocus" onclick=${onToggle}>${title || 'New site'}</button>
        <div class="dropdown-items left">
          <form onsubmit=${onSubmitSiteInfo}>
            <label>Title</label>
            <input type="text" name="title" placeholder="Title" value=${title} oninput=${onChangeMade}>
            <label>Description</label>
            <input type="text" name="description" placeholder="Description" value=${description} oninput=${onChangeMade}>
            <div><button class="btn primary" ${hasChanges ? '' : 'disabled'}>Save</button></div>
          </form>
          <hr>
          <div>
            <button class="btn transparent" onclick=${e => emit('editor-fork')}>
              <i class="fas fa-code-branch"></i> Duplicate this site
            </button>
            ${canDelete
              ? isSaved
                ? yo`
                  <button class="btn transparent" onclick=${e => emit('editor-archive-unsave')}>
                    <i class="fas fa-trash"></i> Move to trash
                  </button>`
                : yo`
                  <button class="btn transparent" onclick=${e => emit('editor-archive-save')}>
                    <i class="fas fa-undo"></i> Restore from trash
                  </button>`
              : ''}
          </div>
        </div>
      </div>`,
    afterOpen (el) {
      el.querySelector('input').focus()
      document.body.prepend(yo`<div class="darken-overlay"></div>`)
    },
    afterClose () {
      hasChanges = false
      document.querySelector('.darken-overlay').remove()
    }
  })
}

export function renderSiteinfoDropdownNonowner (workingDatJson, archiveInfo) {
  const {title, description} = archiveInfo
  return toggleable2({
    id: 'site-info-editor',
    closed: ({onToggle}) => yo`
      <div class="">
        ${title || 'Untitled'}
      </div>`,
    open: ({onToggle}) => yo`
      <div class="siteinfo toggleable-container">
        <button class="btn site-info-btn transparent toggleable nofocus" onclick=${onToggle}>${title || 'Untitled'}</button>
        <div class="dropdown-items left">
          <label>Title</label>
          <input type="text" name="title" placeholder="Untitled" value=${title} readonly>
          <label>Description</label>
          <input type="text" placeholder="No description" value=${description} readonly>
          <hr>
          <div>
            <button class="btn transparent" onclick=${e => emit('editor-fork')}>
              <i class="fas fa-code-branch"></i> Duplicate this site
            </button>
          </div>
        </div>
      </div>`,
    afterOpen (el) {
      document.body.prepend(yo`<div class="darken-overlay"></div>`)
    },
    afterClose () {
      document.querySelector('.darken-overlay').remove()
    }
  })
}

// event handlers
// =

function onSubmitSiteInfo (e) {
  e.preventDefault()
  e.stopPropagation()

  closeAllToggleables()
  emit('editor-set-site-info', {
    title: e.currentTarget.title.value,
    description: e.currentTarget.description.value
  })
}
