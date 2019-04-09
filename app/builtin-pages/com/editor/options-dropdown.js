import yo from 'yo-yo'
import _get from 'lodash.get'
import toggleable2 from '../toggleable2'
import {writeToClipboard, emit} from '../../../lib/fg/event-handlers'
import * as toast from '../toast'

// exported api
// =

export function renderOptionsDropdown ({archiveInfo}) {
  return toggleable2({
    id: 'options-tool',
    closed: ({onToggle}) => yo`
      <div class="dropdown options toggleable-container">
        <button class="btn nofocus toggleable options-dropdown-btn" onclick=${onToggle}>
          <span class="fas fa-cog"></span> Configure
        </button>
      </div>`,
    open: ({onToggle}) => yo`
      <div class="dropdown options toggleable-container">
        <button class="btn nofocus toggleable options-dropdown-btn" onclick=${onToggle}>
          <span class="fas fa-cog"></span> Configure
        </button>

        <div class="dropdown-items subtle-shadow right">
          <div class="dropdown-item no-border">
            ${renderPreviewModeOption({archiveInfo})}
            <hr>
            ${renderSyncPathOption({archiveInfo})}
          </div>
        </div>
      </div>`,
    afterOpen (el) {
      // dynamically position the dropdown against the button's right edge
      el.querySelector('.dropdown-items').style.right = `${document.body.offsetWidth - (el.offsetLeft + el.offsetWidth)}px`
    }
  })
}

// rendering
// =

function renderPreviewModeOption ({archiveInfo}) {
  const previewMode = _get(archiveInfo, 'userSettings.previewMode')

  return yo`
    <div class="option-group">
      <p class="label">
        Preview mode
      </p>

      <p class="input-group radiolist sub-item">
        <label class="toggle unweirded">
          <input
            type="checkbox"
            name="autoPublish"
            value="autoPublish"
            ${previewMode ? 'checked' : ''}
            onclick=${onTogglePreviewMode}
          >
          <div class="switch"></div>
          <span class="text">
            Preview changes before publishing them.
          </span>
        </label>
      </p>
    </div>`
}

function renderSyncPathOption ({archiveInfo}) {
  if (archiveInfo.localSyncPathIsMissing) {
    return yo`
      <div class="option-group">
        <p class="label">
          Local folder
        </p>
        
        <div class="message error">
          <span>This site's local folder was deleted or moved. (${archiveInfo.missingLocalSyncPath})</span>
        </div>

        <p>
          <button class="btn" onclick=${onChangeSyncPath}>
            Choose new folder
          </button>
          <button class="btn" onclick=${onRemoveSyncPath}>
            Remove
          </button>
        </p>
      </div>`
  }

  const path = _get(archiveInfo, 'userSettings.localSyncPath')
  if (path) {
    return yo`
    <div class="option-group">
      <p class="label">
        Local folder
      </p>

      <p class="copy-path">
        <input type="text" disabled value="${path}"/>

        <span class="btn-group">
          <button class="btn" onclick=${() => onCopy(path, 'Path copied to clipboard')}>
            Copy
          </button>

          <button class="btn" onclick=${() => onOpenFolder(path)}>
            Open
          </button>
        </span>
      </p>

      <p>
        <button class="btn warning" onclick=${onRemoveSyncPath}>
          <span class="fas fa-times"></span> Remove
        </button>
        <button class="btn transparent" onclick=${onChangeSyncPath}>
          Change local folder
        </button>
      </p>
    </div>`
  }

  return yo`
    <div class="option-group">
      <p class="label">
        Local folder
      </p>

      <p>Set a local folder to access this site's files from outside of the browser.</p>

      <p>
        <button class="btn" onclick=${onChangeSyncPath}>
          Set local folder
        </button>
      </p>
    </div>`
}

// event handlers
// =

function onTogglePreviewMode (e) {
  emit('editor-toggle-preview-mode')
}

function onChangeSyncPath (e) {
  emit('editor-change-sync-path')
}

function onRemoveSyncPath (e) {
  emit('editor-remove-sync-path')
}

function onCopy (str, successMessage = 'Copied to clipboard') {
  writeToClipboard(str)
  toast.create(successMessage)
}

function onOpenFolder (path) {
  beaker.browser.openFolder(path)
}