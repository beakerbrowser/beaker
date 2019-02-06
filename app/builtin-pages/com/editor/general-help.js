import yo from 'yo-yo'
import {pluralize} from '../../../lib/strings'
import {emit} from '../../../lib/fg/event-handlers'
import createMd from '../../../lib/fg/markdown'

// exported api
// =

export function renderGeneralHelp ({archiveInfo, currentDiff, readmeMd, workingCheckoutVersion, isReadonly}) {
  const isOwner = archiveInfo.isOwner
  const isEditable = !isReadonly
  const versionLabel = (Number.isNaN(+workingCheckoutVersion)) ? workingCheckoutVersion : `v${workingCheckoutVersion}`
  const previewMode = archiveInfo.userSettings.previewMode
  return yo`
    <div class="editor-general-help">
      ${workingCheckoutVersion !== 'latest'
        ? yo`
          <h3 class="viewing">
            Viewing <strong>${versionLabel}</strong>
            <a class="link" href="beaker://editor/${archiveInfo.url}+latest"><span class="fas fa-arrow-right"></span> Go to latest</a>.
          </h3>`
        : previewMode && workingCheckoutVersion !== 'preview'
          ? yo`
            <h3 class="viewing">
              Viewing <strong>${versionLabel}</strong>
              <a class="link" href="beaker://editor/${archiveInfo.url}+preview"><span class="fas fa-arrow-right"></span> Go to preview</a>.
            </h3>`
          : ''}
      ${renderDiff(currentDiff)}
      <div class="quick-links">
        <div class="col">
          ${isEditable
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
            ${isEditable
              ? yo`
                <div class="quick-link">
                  <h3>Actions</h3>
                  <div><a class="link" onclick=${e => emit('editor-new-folder', {path: '/'})}>New folder</a></div>
                  <div><a class="link" onclick=${e => emit('editor-new-file', {path: '/'})}>New file</a></div>
                  ${window.OS_CAN_IMPORT_FOLDERS_AND_FILES
                    ? yo`<div><a class="link" onclick=${e => emit('editor-import-files', {path: '/'})}>Import...</a></div>`
                    : [
                      yo`<div><a class="link" onclick=${e => emit('editor-import-files', {path: '/'})}>Import files...</a></div>`,
                      yo`<div><a class="link" onclick=${e => emit('editor-import-folder', {path: '/'})}>Import folder...</a></div>`
                    ]}
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
            ${isEditable
              ? [
                yo`<div>Want to preview changes? <a class="link" onclick=${doClick('.options-dropdown-btn')}>Enable preview mode</a>.</div>`,
                yo`<div>Not useful anymore? <a class="link" onclick=${e => emit('editor-move-to-trash')}>Move to trash</a>.</div>`
              ] : ''}
          </div>
          ${isEditable
            ? yo`
              <div class="quick-link">
                <h3>Metadata</h3>
                <div>Want to change the title or description? <a class="link" onclick=${doClick('.site-info-btn')}>Edit details</a>.</div>
                <div>Want to change the favicon? <a class="link" onclick=${doClick('.favicon-picker-btn')}>Edit icon</a>.</div>
              </div>`
            : ''}
        </div>
      </div>
      ${renderReadme(archiveInfo, readmeMd)}
    </div>`
}

function renderDiff (currentDiff) {
  if (!currentDiff || !currentDiff.length) {
    return ''
  }

  const total = currentDiff.length
  return yo`
    <div class="uncommitted-changes">
      <h3>${total} uncommitted ${pluralize(total, 'change')}</h3>
      <div class="btns">
        <button class="btn primary" onclick=${onCommitAll}><span class="fas fa-check fa-fw"></span> Commit all changes</button>
        <button class="btn transparent" onclick=${onRevertAll}><span class="fas fa-undo fa-fw"></span> Revert all</button>
      </div>
      ${currentDiff.map(filediff => yo`
        <div>
          <span class="revision-indicator ${filediff.change}"></span>
          <a class=${filediff.change} onclick=${e => emit('editor-set-active', {path: filediff.path})}>${filediff.path}</a>
        </div>
      `)}
    </div>`
}

function renderReadme (archiveInfo, readmeMd) {
  if (!readmeMd) return ''

  var markdownRenderer = createMd({
    hrefMassager (href) {
      var isRelative = href.startsWith('/') || href.startsWith('./')
      if (!isRelative && href.indexOf(':') === -1) {
        isRelative = true
      }
      if (isRelative) {
        if (href.startsWith('./')) href = href.slice(2)
        if (href.startsWith('/')) href = href.slice(1)
        return `${archiveInfo.url}/${href}`
      }
      return href
    }
  })

  var readmeContent = yo`<div class="readme markdown"></div>`
  readmeContent.innerHTML = markdownRenderer.render(readmeMd)
  return readmeContent
}

// event handlers
// =

function onCreateFile (e, path) {
  emit('editor-create-file', {path})
}

function doClick (sel) {
  return e => {
    e.preventDefault()
    e.stopPropagation()
    document.querySelector(sel).click()
  }
}

function onCommitAll (e) {
  if (!confirm('Commit all changes?')) return
  emit('editor-commit-all')
}

function onRevertAll (e) {
  if (!confirm('Rever all changes?')) return
  emit('editor-revert-all')
}