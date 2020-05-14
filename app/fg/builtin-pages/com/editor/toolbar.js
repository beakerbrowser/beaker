import yo from 'yo-yo'
import * as contextInput from '../context-input'

// rendering
// =

export function render (file, model, opts) {
  if (!model) return yo`<div class="editor-toolbar"></div>`
  if (!file) file = {doesNotExist: true}
  var isEditable = file && file.isEditable
  var change = file && file.change
  return yo`
    <div class="editor-toolbar">
      <span class="btn transparent ${model.isDirty ? '' : 'disabled'}"  onclick=${e => onClickSaveFile(e, model)}><i class="fas fa-save"></i> save</span>
      <span class="btn transparent ${file.doesNotExist ? 'disabled' : ''}" onclick=${e => onClickOpenFile(e, model)}><i class="fas fa-external-link-alt"></i> view file</span>
      <span class="btn transparent ${isEditable ? '' : 'disabled'}" onclick=${isEditable ? e => onClickRenameFile(e, model) : undefined}><i class="fas fa-i-cursor"></i> rename</span>
      <span class="btn transparent ${isEditable ? '' : 'disabled'}" onclick=${isEditable ? e => onClickDeleteFile(e, model) : undefined}><i class="fas fa-trash"></i> delete</span>
      ${opts.previewMode
        ? [
          yo`<span class="divider"></span>`,
          change
            ? yo`
              <span class="btn transparent disabled">
                <span class="revision-indicator ${change}"></span>
              </span>`
            : '',
          yo`
            <span
              class="btn transparent ${change ? '' : 'disabled'}"
              onclick=${change ? e => onClickCommitFileChanges(e, model) : undefined}
            >
              <i class="fas fa-check"></i> commit
            </span>`,
          yo`
            <span
              class="btn transparent ${change === 'mod' && model.isEditable ? '' : 'disabled'} ${model.isDiffing ? 'pressed' : ''}"
              onclick=${change && model.isEditable ? e => onClickReviewFileChanges(e, model) : undefined}
            >
              <i class="fas fa-columns"></i> diff
            </span>`,
          yo`
            <span
              class="btn transparent ${change ? '' : 'disabled'}"
              onclick=${change ? e => onClickRevertFileChanges(e, model) : undefined}
            >
              <i class="fa fa-undo"></i> revert
            </span>`,
          yo`<span class="divider"></span>`
        ] : ''}
    </div>`
}

// event handlers
// =

function emit (name, detail = null) {
  document.dispatchEvent(new CustomEvent(name, {detail}))
}

function onClickSaveFile (e, model) {
  if (model.isDirty) {
    emit('editor-save-active-model')
  }
}

function onClickNewFile (e) {
  e.preventDefault()
  e.stopPropagation()
  emit('editor-new-model')
}

function onClickOpenFile (e, model) {
  e.preventDefault()
  e.stopPropagation()
  emit('editor-open-file', {path: model.uri.path})
}

async function onClickRenameFile (e, model) {
  e.preventDefault()
  e.stopPropagation()

  var oldPath = model.uri.path
  var newPath = await contextInput.create({
    x: e.clientX,
    y: e.clientY,
    label: 'Name',
    value: oldPath,
    action: 'Rename',
    postRender () {
      const i = oldPath.lastIndexOf('.')
      if (i !== 0 && i !== -1) {
        // select up to the file-extension
        const input = document.querySelector('.context-input input')
        input.setSelectionRange(oldPath.lastIndexOf('/') + 1, oldPath.lastIndexOf('.'))
      }
    }
  })
  if (newPath) {
    emit('editor-rename-file', {oldPath, newPath})
  }
}

function onClickDeleteFile (e, model) {
  e.preventDefault()
  e.stopPropagation()

  if (confirm('Delete this file?')) {
    emit('editor-delete-file', {path: model.uri.path})
  }
}

function onClickCommitFileChanges (e, model) {
  e.preventDefault()
  e.stopPropagation()

  if (confirm('Commit this file?')) {
    emit('editor-commit-file', {path: model.uri.path})
  }
}

function onClickReviewFileChanges (e, model) {
  e.preventDefault()
  e.stopPropagation()
  emit('editor-diff-active-model')
}

function onClickRevertFileChanges (e, model) {
  e.preventDefault()
  e.stopPropagation()

  if (confirm('Revert this file?')) {
    emit('editor-revert-file', {path: model.uri.path})
  }
}