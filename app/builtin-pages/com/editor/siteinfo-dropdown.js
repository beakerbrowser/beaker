import yo from 'yo-yo'
import _get from 'lodash.get'
import {emit} from '../../../lib/fg/event-handlers'
import toggleable2, {closeAllToggleables}  from '../toggleable2'

// exported api
// =

export function renderSiteinfoDropdown ({archiveInfo}) {
  if (archiveInfo.isOwner) {
    return renderSiteinfoDropdownOwner(archiveInfo)
  }
  return renderSiteinfoDropdownNonowner(archiveInfo)
}

export function renderSiteinfoDropdownOwner (archiveInfo) {
  const {title, description} = archiveInfo
  const {isSaved} = archiveInfo.userSettings
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
            <input type="text" name="title" placeholder="Title" value=${title} autofocus>
            <input type="text" name="description" placeholder="Description" value=${description}>
            <div><button class="btn">Save</button></div>
          </form>
          <hr>
          <div>
            ${isSaved
              ? yo`
                <button class="btn" onclick=${e => emit('editor-archive-unsave')}>
                  <i class="fas fa-trash"></i> Move to trash
                </button>`
              : yo`
                <button class="btn" onclick=${e => emit('editor-archive-save')}>
                  <i class="fas fa-undo"></i> Restore from trash
                </button>`}
          </div>
        </div>
      </div>`,
    afterOpen (el) {
      el.querySelector('input').focus()
      document.body.prepend(yo`<div class="darken-overlay"></div>`)
    },
    afterClose () {
      document.querySelector('.darken-overlay').remove()
    }
  })
}

export function renderSiteinfoDropdownNonowner (archiveInfo) {
  const {title, description} = archiveInfo
  return toggleable2({
    id: 'site-info-editor',
    closed: ({onToggle}) => yo`
      <div class="dropdown toggleable-container">
        <button class="btn site-info-btn transparent toggleable nofocus" onclick=${onToggle}>${title || 'Untitled'}</button>
      </div>`,
    open: ({onToggle}) => yo`
      <div class="dropdown siteinfo toggleable-container">
        <button class="btn site-info-btn transparent toggleable nofocus" onclick=${onToggle}>${title || 'Untitled'}</button>
        <div class="dropdown-items left">
          <h1>${title}</h1>
          <div>${description}</div>
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
