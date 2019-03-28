import yo from 'yo-yo'
import {pluralize} from '../../../lib/strings'
import {emit} from '../../../lib/fg/event-handlers'

// exported api
// =

export function render (opts) {
  const {
    archiveInfo,
    isReadonly,
    OS_USES_META_KEY
  } = opts
  const isEditable = !isReadonly
  const previewMode = archiveInfo.userSettings.previewMode
  return yo`
    <div class="editor-help-sidebar">
      <div class="quick-links">
        <div class="quick-link">
          <h3>Find help</h3>
          <div>Read the <a class="link" href="https://beakerbrowser.com/docs" target="_blank">Beaker documentation</a></div>
        </div>
        <div class="quick-link">
          <h3>Actions</h3>
          ${isEditable
            ? [
              yo`<div><a class="link" onclick=${e => emit('editor-new-folder', {path: '/'})}>New folder</a></div>`,
              yo`<div><a class="link" onclick=${e => emit('editor-new-file', {path: '/'})}>New file</a></div>`,
              window.OS_CAN_IMPORT_FOLDERS_AND_FILES
                ? yo`<div><a class="link" onclick=${e => emit('editor-import-files', {path: '/'})}>Import...</a></div>`
                : [
                  yo`<div><a class="link" onclick=${e => emit('editor-import-files', {path: '/'})}>Import files...</a></div>`,
                  yo`<div><a class="link" onclick=${e => emit('editor-import-folder', {path: '/'})}>Import folder...</a></div>`
                ],
              yo`<div style="height: 10px"></div>`
            ] : ''}
          <div><a class="link" onclick=${e => emit('editor-fork')}>Fork this site</a></div>
          ${archiveInfo.canDelete
            ? yo`<div><a class="link" onclick=${e => emit('editor-archive-unsave')}>Move to trash</a></div>`
            : ''}
        </div>
        ${isEditable
          ? yo`
            <div class="quick-link">
              <h3>Settings</h3>
              <div><a class="link" onclick=${doClick('.site-info-btn')}>Change the title</a></div>
              <div><a class="link" onclick=${doClick('.favicon-picker-btn')}>Change the favicon</a></div>
              <div style="height: 10px"></div>
              <div><a class="link" onclick=${doClick('.options-dropdown-btn')}>${previewMode ? 'Disable' : 'Enable'} preview mode</a></div>
            </div>
          ` : ''}
      </div>
      ${renderHotkeyHelp({OS_USES_META_KEY})}
    </div>
  `
}

function renderHotkeyHelp ({OS_USES_META_KEY}) {
  return
  // TODO restoreme when hotkeys are actually implemented again
  const cmd = '⌘'
  const cmdOrCtrl = OS_USES_META_KEY ? cmd : 'Ctrl'
  const hotkey = (action, ...keys) => yo`<div><strong>${keys.join(' + ')}</strong> - ${action}</div>`
  return yo`
    <div class="hotkeys">
      <h3>Hotkeys</h3>
      ${hotkey('New file', cmdOrCtrl, 'N')}
      ${hotkey('Save the current file', cmdOrCtrl, 'S')}
    </div>`
}

// event handlers
// =

function doClick (sel) {
  return e => {
    e.preventDefault()
    e.stopPropagation()
    document.querySelector(sel).click()
  }
}
