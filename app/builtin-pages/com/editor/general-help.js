import yo from 'yo-yo'
import {emit} from '../../../lib/fg/event-handlers'

// exported api
// =

export function renderGeneralHelp (archiveInfo) {
  const isOwner = archiveInfo.isOwner
  return yo`
    <div class="editor-general-help">
      <div class="quick-links">
        <div class="col">
          ${isOwner
            ? yo`
              <div class="quick-link">
                <h3>Get started</h3>
                <div>
                  Create an
                  <a class="link" onclick=${e => onCreateFile(e, 'index.html')}>index.html</a>
                  or
                  <a class="link" onclick=${e => onCreateFile(e, 'index.md')}>index.md</a>.
                </div>
              </div>`
            : ''}
            ${isOwner
              ? yo`
                <div class="quick-link">
                  <h3>Actions</h3>
                  <div><a class="link" onclick=${e => emit('editor-new-folder', {path: '/'})}>New folder</a></div>
                  <div><a class="link" onclick=${e => emit('editor-new-file', {path: '/'})}>New file</a></div>
                </div>`
              : ''}
          <div class="quick-link">
            <h3>Find help</h3>
            <div>Read the <a class="link" href="https://beakerbrowser.com/docs" target="_blank">Beaker documentation</a>.</div>
          </div>
        </div>
        <div class="col">
          <div class="quick-link">
            <h3>Manage the site</h3>
            <div>Want to make a copy? <a class="link" onclick=${e => emit('editor-fork')}>Duplicate it</a>.</div>
            ${isOwner
              ? yo`<div>Not useful anymore? <a class="link" onclick=${e => emit('editor-move-to-trash')}>Move to trash</a>.</div>`
              : ''}
          </div>
        </div>
      </div>
    </div>`
}

// event handlers
// =

function onCreateFile (e, path) {
  emit('editor-create-file', {path})
}